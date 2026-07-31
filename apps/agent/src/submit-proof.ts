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
  isHash,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export interface SubmitProofInput {
  contestAddress: string;
  contentHash: string;
  metadataUri: string;
  privateKey: Hex;
  rpcUrl?: string;
}

export async function submitProofOnArc(input: SubmitProofInput): Promise<TransactionEvidence> {
  if (!isAddress(input.contestAddress)) throw new Error("Invalid contest address");
  if (!isHash(input.contentHash)) throw new Error("Invalid content hash");
  if (input.metadataUri.length > 256) throw new Error("Metadata URI exceeds contract limit");

  const transport = http(input.rpcUrl ?? ARC_TESTNET_RPC_URL);
  const account = privateKeyToAccount(input.privateKey);
  const publicClient = createPublicClient({ chain: ARC_TESTNET, transport });
  const chainId = await publicClient.getChainId();
  assertArcTestnet(chainId);
  const walletClient = createWalletClient({ account, chain: ARC_TESTNET, transport });
  const hash = await walletClient.writeContract({
    address: input.contestAddress as Address,
    abi: draftPayContestAbi,
    functionName: "submit",
    args: [input.contentHash as Hash, input.metadataUri],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Submission transaction reverted");
  return transactionEvidenceSchema.parse({
    chainId: ARC_TESTNET_CHAIN_ID,
    hash,
    blockNumber: receipt.blockNumber.toString(),
    status: "success",
  });
}
