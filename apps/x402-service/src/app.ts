import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import express, { type NextFunction, type Request, type Response } from "express";
import { isAddress } from "viem";
import {
  analyzeBrief,
  briefAnalysisRequestSchema,
  type BriefAnalysisRequest,
} from "./analysis.js";

type PaidRequest = Request & {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
  };
};

export interface X402ServiceConfig {
  mode: "fixture" | "real";
  sellerAddress?: string;
  facilitatorUrl: string;
  price: string;
}

function securityHeaders(_request: Request, response: Response, next: NextFunction): void {
  response.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  next();
}

function createRateLimiter() {
  const requests = new Map<string, { count: number; resetAt: number }>();
  return (request: Request, response: Response, next: NextFunction): void => {
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const current = requests.get(key);
    if (!current || current.resetAt <= now) {
      requests.set(key, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    current.count += 1;
    if (current.count > 30) {
      response.status(429).json({ error: "Rate limit exceeded" });
      return;
    }
    next();
  };
}

function analyze(request: Request, response: Response): void {
  const parsed = briefAnalysisRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response
      .status(400)
      .json({ error: "Invalid brief analysis request", issues: parsed.error.issues });
    return;
  }
  response.json(analyzeBrief(parsed.data as BriefAnalysisRequest));
}

function validateBrief(request: Request, response: Response, next: NextFunction): void {
  const parsed = briefAnalysisRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response
      .status(400)
      .json({ error: "Invalid brief analysis request", issues: parsed.error.issues });
    return;
  }
  request.body = parsed.data;
  next();
}

export function createApp(config: X402ServiceConfig) {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(express.json({ limit: "16kb" }));
  app.use(createRateLimiter());

  app.get("/health", (_request, response) => {
    response.json({ service: "draftpay-brief-analysis", mode: config.mode, status: "ok" });
  });

  app.post("/fixture/brief-analysis", validateBrief, (request, response) => {
    response.setHeader("x-draftpay-evidence-mode", "fixture");
    analyze(request, response);
  });

  if (config.mode === "real") {
    if (!config.sellerAddress || !isAddress(config.sellerAddress)) {
      throw new Error("A valid X402_SELLER_ADDRESS is required in real mode");
    }
    const gateway = createGatewayMiddleware({
      sellerAddress: config.sellerAddress,
      facilitatorUrl: config.facilitatorUrl,
      networks: ["eip155:5042002"],
    });
    app.post(
      "/x402/brief-analysis",
      validateBrief,
      gateway.require(config.price),
      (request: PaidRequest, response) => {
        if (!request.payment?.verified) {
          response.status(402).json({ error: "Verified payment required" });
          return;
        }
        response.setHeader(
          "x-draftpay-payment-id",
          request.payment.transaction ?? "gateway-settled",
        );
        analyze(request, response);
      },
    );
  } else {
    app.post("/x402/brief-analysis", (_request, response) => {
      response.status(503).json({
        error: "Real x402 mode is not configured",
        fixtureEndpoint: "/fixture/brief-analysis",
        paymentOccurred: false,
      });
    });
  }

  return app;
}
