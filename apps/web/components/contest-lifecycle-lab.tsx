"use client";

import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_USDC_ADDRESS,
  DRAFTPAY_ARC_TESTNET_FACTORY_ADDRESS,
  addressExplorerUrl,
  contestStateLabels,
  draftPayContestAbi,
  draftPayFactoryAbi,
  transactionExplorerUrl,
} from "@draftpay/chain";
import { DataRow, EvidenceBadge, StatusPill } from "@draftpay/ui";
import { Check, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  decodeEventLog,
  getAddress,
  isAddress,
  isHash,
  keccak256,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import {
  useAccount,
  useBlock,
  useChainId,
  usePublicClient,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { shortAddress, usdc } from "@/lib/format";
import {
  availableLifecycleActions,
  hashEvidence,
  parsePositiveSubmissionId,
  parseRankedSubmissionIds,
  resolveArtifactUri,
} from "@/lib/lifecycle-lab";

interface RecordedWrite {
  label: string;
  hash: Hash;
  blockNumber: bigint;
}

function formatDeadline(value: bigint | null): string {
  if (value === null) return "—";
  return new Date(Number(value) * 1_000).toLocaleString();
}

function hasExpectedEvent(
  receipt: TransactionReceipt,
  contestAddress: Address,
  expectedEvents: string[],
): boolean {
  return receipt.logs.some((log) => {
    if (log.address.toLowerCase() !== contestAddress.toLowerCase()) return false;
    try {
      const decoded = decodeEventLog({
        abi: draftPayContestAbi,
        data: log.data,
        topics: log.topics,
      });
      return expectedEvents.includes(decoded.eventName);
    } catch {
      return false;
    }
  });
}

export function ContestLifecycleLab({
  initialContest,
  initialCreationTx,
}: {
  initialContest: string;
  initialCreationTx: string;
}) {
  const [contestInput, setContestInput] = useState(initialContest);
  const [creationTxInput, setCreationTxInput] = useState(initialCreationTx);
  const [artifactUri, setArtifactUri] = useState("/previews/arcpay");
  const [submissionId, setSubmissionId] = useState("1");
  const [qualified, setQualified] = useState(true);
  const [evaluationEvidence, setEvaluationEvidence] = useState(
    "ArcPay preview verified: required headline, live proof, pricing, CTA, contact form, mobile-safe layout, and testnet labels all present.",
  );
  const [rankedIds, setRankedIds] = useState("1");
  const [rankingEvidence, setRankingEvidence] = useState(
    "Single qualifying submission ranked first after deterministic requirement review.",
  );
  const [winnerId, setWinnerId] = useState("1");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writes, setWrites] = useState<RecordedWrite[]>([]);
  const [hasBytecode, setHasBytecode] = useState<boolean | null>(null);
  const [factoryVerified, setFactoryVerified] = useState<boolean | null>(null);
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const [eligibleIds, setEligibleIds] = useState<bigint[]>([]);
  const [submissionAuditLoading, setSubmissionAuditLoading] = useState(false);
  const writeLock = useRef(false);

  const account = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
  const latestBlock = useBlock({
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { refetchInterval: 4_000 },
  });
  const { writeContractAsync } = useWriteContract();
  const configuredFactory =
    process.env.NEXT_PUBLIC_DRAFTPAY_FACTORY_ADDRESS ?? DRAFTPAY_ARC_TESTNET_FACTORY_ADDRESS;
  const factoryAddress =
    configuredFactory && isAddress(configuredFactory) ? getAddress(configuredFactory) : null;
  const contestAddress: Address | null = useMemo(() => {
    const value = contestInput.trim();
    return isAddress(value) ? getAddress(value) : null;
  }, [contestInput]);
  const creationTxHash: Hash | null = useMemo(() => {
    const value = creationTxInput.trim();
    return isHash(value) ? value : null;
  }, [creationTxInput]);

  const reads = useReadContracts({
    contracts: contestAddress
      ? [
          { address: contestAddress, abi: draftPayContestAbi, functionName: "state" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "client" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "evaluator" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "prizeAmount" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "submissionDeadline" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "selectionDeadline" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "submissionCount" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "qualifiedCount" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "finalistCount" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "winnerSubmissionId" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "usdc" },
        ]
      : [],
    query: { enabled: Boolean(contestAddress), refetchInterval: 8_000 },
  });

  useEffect(() => {
    let active = true;
    if (!contestAddress || !publicClient) {
      setHasBytecode(null);
      return;
    }
    setHasBytecode(null);
    void publicClient
      .getCode({ address: contestAddress })
      .then((code) => {
        if (active) setHasBytecode(Boolean(code && code !== "0x"));
      })
      .catch(() => {
        if (active) setHasBytecode(false);
      });
    return () => {
      active = false;
    };
  }, [contestAddress, publicClient]);

  useEffect(() => {
    let active = true;
    if (!contestAddress || !creationTxHash || !factoryAddress || !publicClient) {
      setFactoryVerified(false);
      return;
    }
    setFactoryVerified(null);
    void publicClient
      .getTransactionReceipt({ hash: creationTxHash })
      .then((receipt) => {
        const fromConfiguredFactory =
          receipt.status === "success" &&
          receipt.to?.toLowerCase() === factoryAddress.toLowerCase() &&
          receipt.logs.some((log) => {
            if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) return false;
            try {
              const decoded = decodeEventLog({
                abi: draftPayFactoryAbi,
                data: log.data,
                topics: log.topics,
              });
              return (
                decoded.eventName === "ContestCreated" &&
                decoded.args.contest.toLowerCase() === contestAddress.toLowerCase()
              );
            } catch {
              return false;
            }
          });
        if (active) setFactoryVerified(fromConfiguredFactory);
      })
      .catch(() => {
        if (active) setFactoryVerified(false);
      });
    return () => {
      active = false;
    };
  }, [contestAddress, creationTxHash, factoryAddress, publicClient]);

  const result = (index: number): unknown => {
    const item = reads.data?.[index];
    return item?.status === "success" ? item.result : null;
  };
  const stateResult = result(0);
  const clientResult = result(1);
  const evaluatorResult = result(2);
  const prizeResult = result(3);
  const submissionDeadlineResult = result(4);
  const selectionDeadlineResult = result(5);
  const submissionCountResult = result(6);
  const qualifiedCountResult = result(7);
  const finalistCountResult = result(8);
  const winnerResult = result(9);
  const usdcResult = result(10);
  const state = typeof stateResult === "number" ? stateResult : null;
  const client = typeof clientResult === "string" ? clientResult : null;
  const evaluator = typeof evaluatorResult === "string" ? evaluatorResult : null;
  const prize = typeof prizeResult === "bigint" ? prizeResult : null;
  const submissionDeadline =
    typeof submissionDeadlineResult === "bigint" ? submissionDeadlineResult : null;
  const selectionDeadline =
    typeof selectionDeadlineResult === "bigint" ? selectionDeadlineResult : null;
  const submissionCount = typeof submissionCountResult === "bigint" ? submissionCountResult : null;
  const qualifiedCount = typeof qualifiedCountResult === "number" ? qualifiedCountResult : null;
  const finalistCount = typeof finalistCountResult === "number" ? finalistCountResult : null;
  const winner = typeof winnerResult === "bigint" ? winnerResult : null;
  const contestUsdc = typeof usdcResult === "string" ? usdcResult : null;
  const readsComplete = Boolean(
    contestAddress &&
    reads.data?.length === 11 &&
    reads.data.every((item) => item.status === "success"),
  );
  const contractVerified = Boolean(
    readsComplete &&
    hasBytecode === true &&
    factoryVerified === true &&
    state !== null &&
    state >= 0 &&
    state < contestStateLabels.length &&
    contestUsdc &&
    contestUsdc.toLowerCase() === ARC_TESTNET_USDC_ADDRESS.toLowerCase(),
  );

  useEffect(() => {
    let active = true;
    async function auditSubmissions() {
      if (
        !contestAddress ||
        !publicClient ||
        state !== 2 ||
        submissionCount === null ||
        submissionCount > 100n
      ) {
        setEvaluatedCount(0);
        setEligibleIds([]);
        setSubmissionAuditLoading(false);
        return;
      }
      setSubmissionAuditLoading(true);
      try {
        const submissions = await Promise.all(
          Array.from({ length: Number(submissionCount) }, (_, index) =>
            publicClient.readContract({
              address: contestAddress,
              abi: draftPayContestAbi,
              functionName: "getSubmission",
              args: [BigInt(index + 1)],
            }),
          ),
        );
        if (!active) return;
        setEvaluatedCount(submissions.filter((submission) => submission.evaluated).length);
        setEligibleIds(
          submissions
            .map((submission, index) => ({ submission, id: BigInt(index + 1) }))
            .filter(({ submission }) => submission.finalistEligible)
            .map(({ id }) => id),
        );
      } catch {
        if (!active) return;
        setEvaluatedCount(0);
        setEligibleIds([]);
      } finally {
        if (active) setSubmissionAuditLoading(false);
      }
    }
    void auditSubmissions();
    return () => {
      active = false;
    };
  }, [contestAddress, publicClient, state, submissionCount, qualifiedCount, reads.dataUpdatedAt]);

  const connectedAddress = account.address?.toLowerCase() ?? null;
  const isClient = Boolean(client && connectedAddress === client.toLowerCase());
  const isEvaluator = Boolean(evaluator && connectedAddress === evaluator.toLowerCase());
  const chainNow = latestBlock.data?.timestamp ?? 0n;
  const lifecycleReady = contractVerified && latestBlock.data !== undefined;
  const allSubmissionsEvaluated =
    submissionCount !== null && evaluatedCount === Number(submissionCount);
  const actions = availableLifecycleActions({
    connected: account.isConnected && chainId === ARC_TESTNET_CHAIN_ID,
    contractVerified: lifecycleReady,
    state,
    chainNow,
    submissionDeadline,
    selectionDeadline,
    isClient,
    isEvaluator,
    allSubmissionsEvaluated,
    finalistCount,
  });

  async function executeWrite(
    label: string,
    expectedEvents: string[],
    write: () => Promise<Hash>,
    lockAlreadyHeld = false,
  ) {
    if (!contestAddress || !publicClient || (!lockAlreadyHeld && writeLock.current)) return;
    if (!lockAlreadyHeld) writeLock.current = true;
    setPendingAction(label);
    setError(null);
    try {
      const hash = await write();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error(`${label} reverted`);
      if (receipt.to?.toLowerCase() !== contestAddress.toLowerCase()) {
        throw new Error(`${label} receipt targeted an unexpected contract`);
      }
      if (!hasExpectedEvent(receipt, contestAddress, expectedEvents)) {
        throw new Error(`${label} receipt did not contain the expected contract event`);
      }
      setWrites((current) => [...current, { label, hash, blockNumber: receipt.blockNumber }]);
      await reads.refetch();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : `${label} failed`;
      setError(
        /rejected|denied/i.test(message)
          ? "The wallet rejected the transaction. Contract state did not change."
          : message.split("\n")[0]!.slice(0, 320),
      );
    } finally {
      setPendingAction(null);
      if (!lockAlreadyHeld) writeLock.current = false;
    }
  }

  async function submitArtifact() {
    if (!contestAddress || !account.address || !publicClient || writeLock.current) return;
    writeLock.current = true;
    setError(null);
    try {
      const uri = resolveArtifactUri(artifactUri, window.location.origin);
      setPendingAction("Hashing artifact");
      const response = await fetch(uri, { cache: "no-store" });
      if (!response.ok) throw new Error(`Artifact returned HTTP ${response.status}`);
      const deliverableHash = keccak256(new Uint8Array(await response.arrayBuffer()));
      setPendingAction(null);
      await executeWrite(
        "Artifact submitted",
        ["SubmissionSubmitted"],
        async () => {
          const { request } = await publicClient.simulateContract({
            address: contestAddress,
            abi: draftPayContestAbi,
            functionName: "submit",
            args: [deliverableHash, uri],
            account: account.address,
          });
          return writeContractAsync({ ...request, chainId: ARC_TESTNET_CHAIN_ID });
        },
        true,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Artifact could not be hashed");
    } finally {
      setPendingAction(null);
      writeLock.current = false;
    }
  }

  function beginEvaluation() {
    if (!contestAddress || !account.address || !publicClient) return;
    void executeWrite("Evaluation opened", ["EvaluationOpened"], async () => {
      const { request } = await publicClient.simulateContract({
        address: contestAddress,
        abi: draftPayContestAbi,
        functionName: "beginEvaluation",
        account: account.address,
      });
      return writeContractAsync({ ...request, chainId: ARC_TESTNET_CHAIN_ID });
    });
  }

  function evaluateSubmission() {
    if (!contestAddress || !account.address || !publicClient) return;
    try {
      const id = parsePositiveSubmissionId(submissionId);
      const hash = hashEvidence(evaluationEvidence, "Evaluation evidence");
      void executeWrite(
        qualified ? "Submission qualified" : "Submission rejected",
        [qualified ? "SubmissionQualified" : "SubmissionRejected"],
        async () => {
          const { request } = await publicClient.simulateContract({
            address: contestAddress,
            abi: draftPayContestAbi,
            functionName: "evaluateSubmission",
            args: [id, qualified, hash],
            account: account.address,
          });
          return writeContractAsync({ ...request, chainId: ARC_TESTNET_CHAIN_ID });
        },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evaluation input is invalid");
    }
  }

  function rankFinalists() {
    if (!contestAddress || !account.address || !publicClient) return;
    try {
      const ids = parseRankedSubmissionIds(rankedIds);
      const hash = hashEvidence(rankingEvidence, "Ranking evidence");
      if (qualifiedCount === null || ids.length !== qualifiedCount) {
        throw new Error(`Ranking must contain exactly ${qualifiedCount ?? 0} qualified IDs`);
      }
      const expected = [...eligibleIds].map(String).sort();
      const provided = [...ids].map(String).sort();
      if (expected.join(",") !== provided.join(",")) {
        throw new Error(`Ranking must contain eligible IDs: ${expected.join(", ") || "none"}`);
      }
      if (!allSubmissionsEvaluated) {
        throw new Error("Evaluate every submission before finalizing the ranking");
      }
      void executeWrite("Finalists ranked", ["FinalistsRanked"], async () => {
        const { request } = await publicClient.simulateContract({
          address: contestAddress,
          abi: draftPayContestAbi,
          functionName: "rankFinalists",
          args: [ids, hash],
          account: account.address,
        });
        return writeContractAsync({ ...request, chainId: ARC_TESTNET_CHAIN_ID });
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ranking input is invalid");
    }
  }

  function selectWinner() {
    if (!contestAddress || !account.address || !publicClient) return;
    try {
      const id = parsePositiveSubmissionId(winnerId, "Winner ID");
      void executeWrite("Winner selected and paid", ["WinnerSettled"], async () => {
        const { request } = await publicClient.simulateContract({
          address: contestAddress,
          abi: draftPayContestAbi,
          functionName: "selectWinner",
          args: [id],
          account: account.address,
        });
        return writeContractAsync({ ...request, chainId: ARC_TESTNET_CHAIN_ID });
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Winner input is invalid");
    }
  }

  function settleNoWinner() {
    if (!contestAddress || !account.address || !publicClient) return;
    void executeWrite(
      "No-winner settlement executed",
      ["NoWinnerSettled", "ClientRefunded"],
      async () => {
        const { request } = await publicClient.simulateContract({
          address: contestAddress,
          abi: draftPayContestAbi,
          functionName: "settleNoWinner",
          account: account.address,
        });
        return writeContractAsync({ ...request, chainId: ARC_TESTNET_CHAIN_ID });
      },
    );
  }

  function refundNoQualified() {
    if (!contestAddress || !account.address || !publicClient) return;
    void executeWrite("No-qualified refund executed", ["ClientRefunded"], async () => {
      const { request } = await publicClient.simulateContract({
        address: contestAddress,
        abi: draftPayContestAbi,
        functionName: "refundNoQualified",
        account: account.address,
      });
      return writeContractAsync({ ...request, chainId: ARC_TESTNET_CHAIN_ID });
    });
  }

  const busy = pendingAction !== null;
  const unavailableReason = !account.isConnected
    ? "Connect a wallet to run a lifecycle write."
    : chainId !== ARC_TESTNET_CHAIN_ID
      ? "Switch the wallet to Arc Testnet."
      : !contestAddress
        ? "Enter a valid contest contract address."
        : !creationTxHash
          ? "Add the factory creation transaction to prove this contest's origin."
          : factoryVerified === null ||
              reads.isPending ||
              hasBytecode === null ||
              latestBlock.isPending
            ? "Verifying the contract on Arc Testnet."
            : !contractVerified
              ? "Writes are blocked because the factory receipt or contract identity did not verify."
              : null;

  return (
    <div className="lifecycle-layout">
      <section className="lifecycle-main">
        <div className="lifecycle-card lifecycle-card--address">
          <div className="lifecycle-card__head">
            <div>
              {factoryVerified ? (
                <EvidenceBadge mode="real" />
              ) : (
                <StatusPill tone="amber">Factory proof required</StatusPill>
              )}
              <h2>Contest contract</h2>
            </div>
            <button
              className="button button--secondary"
              type="button"
              disabled={!contestAddress || reads.isFetching}
              onClick={() => void reads.refetch()}
            >
              <RefreshCw size={14} className={reads.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          <div className="field">
            <label htmlFor="lab-contest">Arc contest address</label>
            <input
              id="lab-contest"
              value={contestInput}
              onChange={(event) => {
                setContestInput(event.target.value);
                setError(null);
                setWrites([]);
              }}
              placeholder="0x…"
              spellCheck={false}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="lab-creation-tx">Factory creation transaction</label>
            <input
              id="lab-creation-tx"
              value={creationTxInput}
              onChange={(event) => {
                setCreationTxInput(event.target.value);
                setError(null);
                setWrites([]);
              }}
              placeholder="0x…"
              spellCheck={false}
              disabled={busy}
            />
            <small>
              The successful factory receipt must contain this exact contest address before any
              write is enabled.
            </small>
          </div>
          {contestInput && !contestAddress && (
            <p className="notice notice--error">Enter a valid EVM contract address.</p>
          )}
          {creationTxInput && !creationTxHash && (
            <p className="notice notice--error">Enter a valid 32-byte creation transaction hash.</p>
          )}
          {contestAddress && (
            <div className="lifecycle-proof-links">
              <a
                className="transaction-link lifecycle-explorer-link"
                href={addressExplorerUrl(contestAddress)}
                target="_blank"
                rel="noreferrer"
              >
                Open contract on ArcScan <ExternalLink size={12} />
              </a>
              {creationTxHash && (
                <a
                  className="transaction-link lifecycle-explorer-link"
                  href={transactionExplorerUrl(creationTxHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Verify factory receipt <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}
        </div>

        <div className="lifecycle-card">
          <div className="lifecycle-card__head">
            <div>
              <span className="metric-label">Step 1 · builder</span>
              <h2>Submit a public artifact</h2>
            </div>
            <StatusPill tone={actions.submit ? "teal" : "neutral"}>
              {actions.submit ? "Open" : "Unavailable"}
            </StatusPill>
          </div>
          <div className="field">
            <label htmlFor="artifact-uri">Artifact URL</label>
            <input
              id="artifact-uri"
              type="url"
              value={artifactUri}
              onChange={(event) => setArtifactUri(event.target.value)}
            />
            <small>The page bytes are fetched and hashed immediately before wallet approval.</small>
          </div>
          <button
            className="button"
            type="button"
            disabled={!actions.submit || busy}
            onClick={() => void submitArtifact()}
          >
            {pendingAction === "Hashing artifact" || pendingAction === "Artifact submitted" ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            Hash and submit artifact
          </button>
        </div>

        <div className="lifecycle-card">
          <div className="lifecycle-card__head">
            <div>
              <span className="metric-label">Step 2 · evaluator</span>
              <h2>Open and record evaluation</h2>
            </div>
            <StatusPill tone={state === 2 ? "amber" : "neutral"}>
              {state === 2 ? "Evaluation" : "Waiting"}
            </StatusPill>
          </div>
          <button
            className="button button--secondary"
            type="button"
            disabled={!actions.beginEvaluation || busy}
            onClick={beginEvaluation}
          >
            Open evaluation after submission deadline
          </button>
          <div className="field-row">
            <div className="field">
              <label htmlFor="submission-id">Submission ID</label>
              <input
                id="submission-id"
                inputMode="numeric"
                value={submissionId}
                onChange={(event) => setSubmissionId(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="qualification">Decision</label>
              <select
                id="qualification"
                value={qualified ? "qualified" : "rejected"}
                onChange={(event) => setQualified(event.target.value === "qualified")}
              >
                <option value="qualified">Qualified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="evaluation-evidence">Evaluation evidence</label>
            <textarea
              id="evaluation-evidence"
              value={evaluationEvidence}
              onChange={(event) => setEvaluationEvidence(event.target.value)}
            />
            <small>This text is hashed locally; only its evidence hash is written onchain.</small>
          </div>
          <button
            className="button"
            type="button"
            disabled={!actions.evaluate || busy}
            onClick={evaluateSubmission}
          >
            Record evaluation
          </button>
        </div>

        <div className="lifecycle-card">
          <div className="lifecycle-card__head">
            <div>
              <span className="metric-label">Step 3 · evaluator</span>
              <h2>Rank qualified finalists</h2>
            </div>
            <StatusPill tone={allSubmissionsEvaluated && state === 2 ? "teal" : "neutral"}>
              {submissionAuditLoading
                ? "Checking"
                : `${evaluatedCount}/${submissionCount?.toString() ?? "—"} evaluated`}
            </StatusPill>
          </div>
          <div className="field">
            <label htmlFor="ranked-ids">Ordered submission IDs</label>
            <input
              id="ranked-ids"
              value={rankedIds}
              onChange={(event) => setRankedIds(event.target.value)}
              placeholder="1, 2, 3"
            />
            <small>Enter every qualified finalist, best first. Leave empty if none qualify.</small>
          </div>
          <div className="field">
            <label htmlFor="ranking-evidence">Ranking evidence</label>
            <textarea
              id="ranking-evidence"
              value={rankingEvidence}
              onChange={(event) => setRankingEvidence(event.target.value)}
            />
          </div>
          <button
            className="button"
            type="button"
            disabled={!actions.rank || submissionAuditLoading || busy}
            onClick={rankFinalists}
          >
            Finalize ranking
          </button>
        </div>

        <div className="lifecycle-card">
          <div className="lifecycle-card__head">
            <div>
              <span className="metric-label">Step 4 · client</span>
              <h2>Select winner or settle safely</h2>
            </div>
          </div>
          <div className="field">
            <label htmlFor="winner-id">Winner submission ID</label>
            <input
              id="winner-id"
              inputMode="numeric"
              value={winnerId}
              onChange={(event) => setWinnerId(event.target.value)}
            />
          </div>
          <div className="lifecycle-action-row">
            <button
              className="button"
              type="button"
              disabled={!actions.selectWinner || busy}
              onClick={selectWinner}
            >
              Select winner and pay
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={!actions.settleNoWinner || busy}
              onClick={settleNoWinner}
            >
              Settle without winner
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={!actions.refundNoQualified || busy}
              onClick={refundNoQualified}
            >
              Refund no-qualified contest
            </button>
          </div>
        </div>

        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        {unavailableReason && <p className="notice notice--amber">{unavailableReason}</p>}
      </section>

      <aside className="lifecycle-sidebar">
        <div className="side-panel">
          <div className="lifecycle-card__head">
            <h2>Live contract state</h2>
            {state !== null && (
              <StatusPill tone={[4, 5, 6].includes(state) ? "teal" : "blue"}>
                {contestStateLabels[state] ?? `Unknown ${state}`}
              </StatusPill>
            )}
          </div>
          <DataRow label="Provenance">
            {factoryVerified ? "Factory receipt verified" : "Not verified"}
          </DataRow>
          <DataRow label="Prize">{prize === null ? "—" : usdc(prize)}</DataRow>
          <DataRow label="Client">{client ? shortAddress(client, 7) : "—"}</DataRow>
          <DataRow label="Evaluator">{evaluator ? shortAddress(evaluator, 7) : "—"}</DataRow>
          <DataRow label="Submissions">{submissionCount?.toString() ?? "—"}</DataRow>
          <DataRow label="Qualified">{qualifiedCount?.toString() ?? "—"}</DataRow>
          <DataRow label="Finalists">{finalistCount?.toString() ?? "—"}</DataRow>
          <DataRow label="Winner">{winner && winner > 0n ? `#${winner}` : "—"}</DataRow>
          <DataRow label="Submit by">{formatDeadline(submissionDeadline)}</DataRow>
          <DataRow label="Select by">{formatDeadline(selectionDeadline)}</DataRow>
          <p className="form-help">
            Connected role: {isClient ? "client" : "—"}
            {isClient && isEvaluator ? " + " : ""}
            {isEvaluator ? "evaluator" : ""}. Builder submission is permissionless while open.
          </p>
        </div>

        <div className="side-panel lifecycle-receipts">
          <h2>Session receipts</h2>
          {writes.length === 0 ? (
            <p className="form-help">Successful writes from this browser session appear here.</p>
          ) : (
            <ol className="transaction-steps">
              {writes.map((write) => (
                <li key={write.hash}>
                  <div>
                    <strong>{write.label}</strong>
                    <div>Block {write.blockNumber.toString()}</div>
                    <a
                      className="transaction-link"
                      href={transactionExplorerUrl(write.hash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {write.hash}
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
