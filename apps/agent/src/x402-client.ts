import { GatewayClient } from "@circle-fin/x402-batching/client";
import {
  analyzeBrief,
  briefAnalysisRequestSchema,
  briefAnalysisResponseSchema,
  type BriefAnalysisRequest,
  type BriefAnalysisResponse,
} from "@draftpay/shared";
import type { Hex } from "viem";
import type { SpendingPolicy } from "./spending-policy";

export interface ToolPaymentEvidence {
  mode: "fixture" | "real";
  paymentOccurred: boolean;
  amountAtomic: string;
  network: "eip155:5042002";
  payer: string | null;
  receiptId: string | null;
  serviceUrl: string;
  status: "fixture" | "settled";
}

export interface PaidBriefAnalysisResult {
  analysis: BriefAnalysisResponse;
  payment: ToolPaymentEvidence;
}

export interface X402BriefClient {
  quote(): Promise<string>;
  analyze(request: BriefAnalysisRequest): Promise<PaidBriefAnalysisResult>;
}

function collectAtomicAmounts(value: unknown, amounts: bigint[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectAtomicAmounts(item, amounts);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "amount" && typeof child === "string" && /^\d+$/.test(child)) {
      amounts.push(BigInt(child));
    } else {
      collectAtomicAmounts(child, amounts);
    }
  }
}

export class CircleGatewayX402Client implements X402BriefClient {
  readonly #gateway: GatewayClient;

  constructor(
    private readonly serviceUrl: string,
    private readonly policy: SpendingPolicy,
    private readonly privateKey: Hex,
  ) {
    this.#gateway = new GatewayClient({ chain: "arcTestnet", privateKey });
  }

  async quote(): Promise<string> {
    const support = await this.#gateway.supports(this.serviceUrl);
    if (!support.supported || !support.requirements) {
      throw new Error(support.error ?? "Service does not advertise Circle Gateway support");
    }
    const quotedAmounts: bigint[] = [];
    collectAtomicAmounts(support.requirements, quotedAmounts);
    if (quotedAmounts.length === 0)
      throw new Error("x402 response did not contain an atomic price");
    const quoted = quotedAmounts.reduce((highest, current) =>
      current > highest ? current : highest,
    );
    this.policy.assertCanSpend(this.serviceUrl, quoted);
    return quoted.toString();
  }

  async analyze(request: BriefAnalysisRequest): Promise<PaidBriefAnalysisResult> {
    const parsed = briefAnalysisRequestSchema.parse(request);
    await this.quote();

    const result = await this.#gateway.pay<BriefAnalysisResponse>(this.serviceUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed),
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Paid service returned ${result.status}`);
    }
    this.policy.assertCanSpend(this.serviceUrl, result.amount);
    this.policy.recordVerifiedPayment(result.amount);

    return {
      analysis: briefAnalysisResponseSchema.parse(result.data),
      payment: {
        mode: "real",
        paymentOccurred: true,
        amountAtomic: result.amount.toString(),
        network: "eip155:5042002",
        payer: this.#gateway.address,
        receiptId: result.transaction,
        serviceUrl: this.serviceUrl,
        status: "settled",
      },
    };
  }
}

export class FixtureX402Client implements X402BriefClient {
  constructor(private readonly serviceUrl = "fixture://brief-analysis") {}

  async quote(): Promise<string> {
    return "0";
  }

  async analyze(request: BriefAnalysisRequest): Promise<PaidBriefAnalysisResult> {
    return {
      analysis: analyzeBrief(briefAnalysisRequestSchema.parse(request)),
      payment: {
        mode: "fixture",
        paymentOccurred: false,
        amountAtomic: "0",
        network: "eip155:5042002",
        payer: null,
        receiptId: null,
        serviceUrl: this.serviceUrl,
        status: "fixture",
      },
    };
  }
}
