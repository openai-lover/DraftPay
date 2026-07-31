import {
  ARC_TESTNET,
  ARC_TESTNET_RPC_URL,
  ARC_TESTNET_USDC_ADDRESS,
  assertArcTestnet,
  draftPayContestAbi,
} from "@draftpay/chain";
import {
  approvedContestMetadataSchema,
  canonicalJson,
  type ApprovedContestMetadata,
  type ContestLifecycleState,
  type ContestSummary,
} from "@draftpay/shared";
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  keccak256,
  toBytes,
  type Address,
} from "viem";

const stateNames: ContestLifecycleState[] = [
  "created",
  "submission-open",
  "evaluation",
  "awaiting-selection",
  "settled-with-winner",
  "settled-without-winner",
  "refunded",
  "cancelled",
];

export interface ReadContestInput {
  contestAddress: string;
  metadata: ApprovedContestMetadata;
  rpcUrl?: string;
}

export interface ContestSnapshot {
  token: Address;
  prize: bigint;
  submissionDeadline: bigint;
  selectionDeadline: bigint;
  specificationHash: `0x${string}`;
  state: number;
  qualifiedCount: number;
}

export function contestSummaryFromSnapshot(
  address: Address,
  metadataInput: ApprovedContestMetadata,
  snapshot: ContestSnapshot,
): ContestSummary {
  const metadata = approvedContestMetadataSchema.parse(metadataInput);
  if (getAddress(snapshot.token) !== ARC_TESTNET_USDC_ADDRESS) {
    throw new Error("Contest does not use the verified Arc USDC interface");
  }
  if (snapshot.prize.toString() !== metadata.prizeAtomic) {
    throw new Error("Approved metadata prize does not match the contest");
  }
  if (Number(snapshot.submissionDeadline) !== metadata.submissionDeadlineEpochSeconds) {
    throw new Error("Approved metadata submission deadline does not match the contest");
  }
  if (Number(snapshot.selectionDeadline) !== metadata.selectionDeadlineEpochSeconds) {
    throw new Error("Approved metadata selection deadline does not match the contest");
  }
  const expectedSpecificationHash = keccak256(toBytes(canonicalJson(metadata)));
  if (snapshot.specificationHash !== expectedSpecificationHash) {
    throw new Error("Approved metadata hash does not match the contest");
  }
  const lifecycleState = stateNames[snapshot.state];
  if (!lifecycleState) throw new Error(`Unknown contest state ${snapshot.state}`);

  return {
    id: `arc-${address.toLowerCase()}`,
    mode: "real",
    title: metadata.specification.title,
    brief: metadata.specification.brief,
    requiredHeadline: metadata.specification.requiredHeadline,
    category: metadata.specification.category,
    prizeAtomic: snapshot.prize.toString(),
    state: lifecycleState,
    submissionDeadline: new Date(Number(snapshot.submissionDeadline) * 1_000).toISOString(),
    selectionDeadline: new Date(Number(snapshot.selectionDeadline) * 1_000).toISOString(),
    qualifiedCount: snapshot.qualifiedCount,
    requirements: metadata.specification.requirements,
    contractAddress: address,
    fundingTransactionHash: null,
  };
}

/** Reads and cross-checks every economic input used by the real Builder Agent. */
export async function readContestOnArc(input: ReadContestInput): Promise<ContestSummary> {
  if (!isAddress(input.contestAddress)) throw new Error("Invalid contest address");
  const metadata = approvedContestMetadataSchema.parse(input.metadata);
  const address = getAddress(input.contestAddress);
  const client = createPublicClient({
    chain: ARC_TESTNET,
    transport: http(input.rpcUrl ?? ARC_TESTNET_RPC_URL),
  });
  assertArcTestnet(await client.getChainId());

  const [
    token,
    prize,
    submissionDeadline,
    selectionDeadline,
    specificationHash,
    state,
    qualifiedCount,
  ] = await Promise.all([
    client.readContract({ address, abi: draftPayContestAbi, functionName: "usdc" }),
    client.readContract({ address, abi: draftPayContestAbi, functionName: "prizeAmount" }),
    client.readContract({ address, abi: draftPayContestAbi, functionName: "submissionDeadline" }),
    client.readContract({ address, abi: draftPayContestAbi, functionName: "selectionDeadline" }),
    client.readContract({ address, abi: draftPayContestAbi, functionName: "specificationHash" }),
    client.readContract({ address, abi: draftPayContestAbi, functionName: "state" }),
    client.readContract({ address, abi: draftPayContestAbi, functionName: "qualifiedCount" }),
  ]);

  return contestSummaryFromSnapshot(address as Address, metadata, {
    token,
    prize,
    submissionDeadline,
    selectionDeadline,
    specificationHash,
    state: Number(state),
    qualifiedCount: Number(qualifiedCount),
  });
}
