import {
  ARC_TESTNET,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_RPC_URL,
  assertArcTestnet,
  draftPayContestAbi,
} from "@draftpay/chain";
import { transactionEvidenceSchema, type TransactionEvidence } from "@draftpay/shared";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export interface EvaluationAssessment {
  submissionId: bigint;
  qualified: boolean;
  score: number;
  hardChecks: Array<{ id: string; passed: boolean; detail: string }>;
}

export interface EvaluateContestInput {
  contestAddress: string;
  privateKey: Hex;
  assessments: EvaluationAssessment[];
  rpcUrl?: string;
}

/** Executes the evaluator-only qualification and bounded ranking transactions on a fresh contest. */
export async function evaluateContestOnArc(
  input: EvaluateContestInput,
): Promise<TransactionEvidence[]> {
  if (!isAddress(input.contestAddress)) throw new Error("Invalid contest address");
  if (input.assessments.filter((assessment) => assessment.qualified).length > 3) {
    throw new Error("At most three qualified finalists are supported");
  }
  if (input.assessments.some((assessment) => assessment.submissionId <= 0n)) {
    throw new Error("Submission IDs must be positive");
  }
  if (
    new Set(input.assessments.map((assessment) => assessment.submissionId.toString())).size !==
    input.assessments.length
  ) {
    throw new Error("Submission IDs must be unique");
  }
  if (
    input.assessments.some(
      (assessment) =>
        !Number.isInteger(assessment.score) || assessment.score < 0 || assessment.score > 100,
    )
  ) {
    throw new Error("Verification scores must be integers from 0 to 100");
  }

  const transport = http(input.rpcUrl ?? ARC_TESTNET_RPC_URL);
  const publicClient = createPublicClient({ chain: ARC_TESTNET, transport });
  assertArcTestnet(await publicClient.getChainId());
  const account = privateKeyToAccount(input.privateKey);
  const walletClient = createWalletClient({ account, chain: ARC_TESTNET, transport });
  const address = input.contestAddress as Address;
  const evaluator = await publicClient.readContract({
    address,
    abi: draftPayContestAbi,
    functionName: "evaluator",
  });
  if (evaluator.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error("Configured key is not the contest evaluator");
  }

  const transactions: TransactionEvidence[] = [];
  async function confirm(hash: Hex) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`Evaluator transaction ${hash} reverted`);
    transactions.push(
      transactionEvidenceSchema.parse({
        chainId: ARC_TESTNET_CHAIN_ID,
        hash,
        blockNumber: receipt.blockNumber.toString(),
        status: "success",
      }),
    );
  }

  let state = Number(
    await publicClient.readContract({ address, abi: draftPayContestAbi, functionName: "state" }),
  );
  if (state === 1) {
    const [submissionDeadline, block] = await Promise.all([
      publicClient.readContract({
        address,
        abi: draftPayContestAbi,
        functionName: "submissionDeadline",
      }),
      publicClient.getBlock(),
    ]);
    if (block.timestamp < submissionDeadline) throw new Error("Submission deadline has not passed");
    await confirm(
      await walletClient.writeContract({
        address,
        abi: draftPayContestAbi,
        functionName: "beginEvaluation",
      }),
    );
    state = 2;
  }
  if (state !== 2) throw new Error(`Contest must be in Evaluation state, received ${state}`);

  for (const assessment of input.assessments) {
    const hardFailure = assessment.hardChecks.some((check) => !check.passed);
    if (hardFailure && assessment.qualified) {
      throw new Error(
        `Submission ${assessment.submissionId} cannot qualify with a failed hard check`,
      );
    }
    const evaluationHash = keccak256(
      toBytes(
        JSON.stringify({
          submissionId: assessment.submissionId.toString(),
          qualified: assessment.qualified,
          score: assessment.score,
          hardChecks: assessment.hardChecks,
        }),
      ),
    );
    await confirm(
      await walletClient.writeContract({
        address,
        abi: draftPayContestAbi,
        functionName: "evaluateSubmission",
        args: [assessment.submissionId, assessment.qualified, evaluationHash],
      }),
    );
  }

  const ranked = input.assessments
    .filter((assessment) => assessment.qualified)
    .sort((left, right) => right.score - left.score)
    .map((assessment) => assessment.submissionId);
  const rankingEvidenceHash = keccak256(
    toBytes(JSON.stringify(ranked.map((submissionId) => submissionId.toString()))),
  );
  await confirm(
    await walletClient.writeContract({
      address,
      abi: draftPayContestAbi,
      functionName: "rankFinalists",
      args: [ranked, rankingEvidenceHash],
    }),
  );
  return transactions;
}
