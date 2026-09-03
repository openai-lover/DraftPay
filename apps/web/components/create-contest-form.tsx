"use client";

import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_USDC_ADDRESS,
  DRAFTPAY_ARC_TESTNET_FACTORY_ADDRESS,
  draftPayContestAbi,
  draftPayFactoryAbi,
  transactionExplorerUrl,
  usdcAbi,
} from "@draftpay/chain";
import {
  approvedContestMetadataSchema,
  canonicalJson,
  createStructuredSpecification,
  parseUsdc,
  type ApprovedContestMetadata,
  type StructuredSpecification,
} from "@draftpay/shared";
import { EvidenceBadge, StatusPill } from "@draftpay/ui";
import { Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  decodeEventLog,
  isAddress,
  keccak256,
  toBytes,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";

interface CompletedTransaction {
  label: string;
  hash: Hash;
  blockNumber: bigint;
}

type WriteStage = "idle" | "creating" | "approving" | "funding" | "complete" | "error";

function contestFromReceipt(receipt: TransactionReceipt): Address {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: draftPayFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "ContestCreated") return decoded.args.contest;
    } catch {
      // Other logs in the receipt are intentionally ignored.
    }
  }
  throw new Error("Factory receipt did not contain ContestCreated");
}

function futureLocalDateTime(hours: number): string {
  const date = new Date(Date.now() + hours * 60 * 60 * 1_000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1_000);
  return local.toISOString().slice(0, 16);
}

export function CreateContestForm() {
  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState("Build the Ledgerly SaaS launch page");
  const [brief, setBrief] = useState(
    "Build a responsive SaaS landing page for Ledgerly with a strong hero, a three-tier pricing section, a primary call-to-action, and a contact form. The page must work at mobile widths without horizontal overflow.",
  );
  const [headline, setHeadline] = useState("Close the books without closing your weekend.");
  const [prize, setPrize] = useState("100");
  const [submissionDeadline, setSubmissionDeadline] = useState(() => futureLocalDateTime(24));
  const [selectionDeadline, setSelectionDeadline] = useState(() => futureLocalDateTime(48));
  const [evaluator, setEvaluator] = useState(process.env.NEXT_PUBLIC_DEMO_EVALUATOR_ADDRESS ?? "");
  const [specification, setSpecification] = useState<StructuredSpecification | null>(null);
  const [approved, setApproved] = useState(false);
  const [stage, setStage] = useState<WriteStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [contestAddress, setContestAddress] = useState<Address | null>(null);
  const [transactions, setTransactions] = useState<CompletedTransaction[]>([]);

  const account = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const factory =
    process.env.NEXT_PUBLIC_DRAFTPAY_FACTORY_ADDRESS ?? DRAFTPAY_ARC_TESTNET_FACTORY_ADDRESS;
  const factoryAddress = factory && isAddress(factory) ? factory : null;
  const connectedCorrectly = account.isConnected && chainId === ARC_TESTNET_CHAIN_ID;

  useEffect(() => setHydrated(true), []);

  const canWrite = useMemo(
    () =>
      Boolean(
        approved &&
        specification &&
        connectedCorrectly &&
        factoryAddress &&
        isAddress(evaluator) &&
        publicClient,
      ),
    [approved, connectedCorrectly, evaluator, factoryAddress, publicClient, specification],
  );

  function invalidateSpecification() {
    setSpecification(null);
    setApproved(false);
  }

  function generateSpecification(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSpecification(null);
    setApproved(false);
    setStage("idle");
    setContestAddress(null);
    setTransactions([]);
    try {
      setSpecification(createStructuredSpecification({ title, brief, requiredHeadline: headline }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The brief could not be structured");
    }
  }

  function buildApprovedMetadata(): ApprovedContestMetadata {
    if (!specification) throw new Error("Generate the structured specification first");
    const amount = parseUsdc(prize);
    const submissionSeconds = Math.floor(new Date(submissionDeadline).getTime() / 1_000);
    const selectionSeconds = Math.floor(new Date(selectionDeadline).getTime() / 1_000);
    if (
      !Number.isSafeInteger(submissionSeconds) ||
      !Number.isSafeInteger(selectionSeconds) ||
      submissionSeconds <= Math.floor(Date.now() / 1_000) ||
      selectionSeconds <= submissionSeconds
    ) {
      throw new Error("Use a future submission deadline and a later selection deadline");
    }
    return approvedContestMetadataSchema.parse({
      specification: { ...specification, approved: true },
      prizeAtomic: amount.toString(),
      submissionDeadlineEpochSeconds: submissionSeconds,
      selectionDeadlineEpochSeconds: selectionSeconds,
    });
  }

  function downloadAgentMetadata() {
    try {
      const metadata = buildApprovedMetadata();
      const url = URL.createObjectURL(
        new Blob([`${JSON.stringify(metadata, null, 2)}\n`], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "draftpay-contest-metadata.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Metadata could not be prepared");
    }
  }

  async function recordTransaction(label: string, hash: Hash) {
    if (!publicClient) throw new Error("Arc client is unavailable");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${label} transaction reverted`);
    setTransactions((current) => [...current, { label, hash, blockNumber: receipt.blockNumber }]);
    return receipt;
  }

  async function deployAndFund() {
    if (!specification || !factoryAddress || !isAddress(evaluator) || !publicClient) return;
    if (!account.address) {
      setError("Connect a wallet before creating the contest");
      return;
    }
    setError(null);
    setTransactions([]);
    setContestAddress(null);
    try {
      const metadata = buildApprovedMetadata();
      const amount = BigInt(metadata.prizeAtomic);
      const specificationHash = keccak256(toBytes(canonicalJson(metadata)));

      setStage("creating");
      const createHash = await writeContractAsync({
        address: factoryAddress,
        abi: draftPayFactoryAbi,
        functionName: "createContest",
        args: [
          evaluator,
          amount,
          BigInt(metadata.submissionDeadlineEpochSeconds),
          BigInt(metadata.selectionDeadlineEpochSeconds),
          specificationHash,
        ],
        chainId: ARC_TESTNET_CHAIN_ID,
        account: account.address,
      });
      const createReceipt = await recordTransaction("Contest created", createHash);
      const createdContest = contestFromReceipt(createReceipt);
      setContestAddress(createdContest);

      setStage("approving");
      const approveHash = await writeContractAsync({
        address: ARC_TESTNET_USDC_ADDRESS,
        abi: usdcAbi,
        functionName: "approve",
        args: [createdContest, amount],
        chainId: ARC_TESTNET_CHAIN_ID,
        account: account.address,
      });
      await recordTransaction("USDC approved", approveHash);

      setStage("funding");
      const fundHash = await writeContractAsync({
        address: createdContest,
        abi: draftPayContestAbi,
        functionName: "fund",
        chainId: ARC_TESTNET_CHAIN_ID,
        account: account.address,
      });
      await recordTransaction("Contest funded", fundHash);
      setStage("complete");
    } catch (cause) {
      setStage("error");
      const message = cause instanceof Error ? cause.message : "Wallet transaction failed";
      setError(
        /rejected|denied/i.test(message)
          ? "The wallet transaction was rejected. No success was recorded."
          : message,
      );
    }
  }

  const stageLabel: Record<WriteStage, string> = {
    idle: "Deploy and fund on Arc",
    creating: "Creating contest…",
    approving: "Approving USDC…",
    funding: "Funding escrow…",
    complete: "Contest funded",
    error: "Retry deployment",
  };
  const creationTransaction = transactions.find(
    (transaction) => transaction.label === "Contest created",
  );

  return (
    <div className="form-layout">
      <form className="form-stack" onSubmit={generateSpecification}>
        <div className="field">
          <label htmlFor="title">Project title</label>
          <input
            id="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              invalidateSpecification();
            }}
            maxLength={100}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="brief">Project brief</label>
          <textarea
            id="brief"
            value={brief}
            onChange={(event) => {
              setBrief(event.target.value);
              invalidateSpecification();
            }}
            maxLength={4000}
            required
          />
          <small>Only responsive landing-page contests are supported in this MVP.</small>
        </div>
        <div className="field">
          <label htmlFor="headline">Required headline</label>
          <input
            id="headline"
            value={headline}
            onChange={(event) => {
              setHeadline(event.target.value);
              invalidateSpecification();
            }}
            maxLength={180}
            required
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="prize">Prize (test USDC)</label>
            <input
              id="prize"
              inputMode="decimal"
              value={prize}
              onChange={(event) => {
                setPrize(event.target.value);
                invalidateSpecification();
              }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="evaluator">Evaluator address</label>
            <input
              id="evaluator"
              value={evaluator}
              onChange={(event) => {
                setEvaluator(event.target.value);
                invalidateSpecification();
              }}
              placeholder="0x…"
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="submission">Submission deadline</label>
            <input
              id="submission"
              type="datetime-local"
              value={submissionDeadline}
              onChange={(event) => {
                setSubmissionDeadline(event.target.value);
                invalidateSpecification();
              }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="selection">Selection deadline</label>
            <input
              id="selection"
              type="datetime-local"
              value={selectionDeadline}
              onChange={(event) => {
                setSelectionDeadline(event.target.value);
                invalidateSpecification();
              }}
              required
            />
          </div>
        </div>
        <button className="button button--dark" type="submit" disabled={!hydrated}>
          Generate structured requirements
        </button>
        {!factoryAddress && (
          <div className="notice notice--amber">
            No DraftPay factory is configured. Specification review works, but contract writes
            remain disabled until a real deployed address is supplied.
          </div>
        )}
        {!account.isConnected && (
          <div className="notice">
            Wallet disconnected. Connect an Arc Testnet wallet to enable funding.
          </div>
        )}
        {account.isConnected && chainId !== ARC_TESTNET_CHAIN_ID && (
          <div className="notice notice--error">
            Wrong network. Switch the connected wallet to Arc Testnet before writing.
          </div>
        )}
        {error && (
          <div className="notice notice--error" role="alert">
            {error}
          </div>
        )}
      </form>

      <aside className="spec-panel">
        {!specification ? (
          <div className="spec-empty">
            <div>
              <strong>Specification Agent output</strong>
              <p>
                Generate the checklist, review every hard requirement, then approve it before
                funding.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="spec-panel__head">
              <EvidenceBadge mode="fixture" />
              <h2>Structured requirements</h2>
              <p style={{ margin: "5px 0 0", color: "var(--ink-soft)" }}>
                Deterministic fallback parser · review required
              </p>
            </div>
            <div className="spec-panel__body">
              <ul className="check-list">
                {specification.requirements.map((requirement) => (
                  <li key={requirement.id}>
                    <Check size={14} color="var(--teal)" /> {requirement.label}
                  </li>
                ))}
              </ul>
              <div className="data-row">
                <span>Required text</span>
                <strong>{specification.requiredHeadline}</strong>
              </div>
              <div className="data-row">
                <span>Responsive checks</span>
                <strong>{specification.responsiveBreakpoints.join(" / ")}px</strong>
              </div>
              <div className="data-row">
                <span>Scoring rubric</span>
                <strong>
                  {specification.scoringRubric
                    .map((criterion) => `${criterion.label} ${criterion.weightBps / 100}%`)
                    .join(" · ")}
                </strong>
              </div>
              <div className="data-row">
                <span>Submission deadline</span>
                <strong>{new Date(submissionDeadline).toLocaleString()}</strong>
              </div>
              <div className="data-row">
                <span>Prize</span>
                <strong>{prize} test USDC</strong>
              </div>
              {!approved ? (
                <button
                  className="button button--wide"
                  type="button"
                  onClick={() => setApproved(true)}
                >
                  Approve specification
                </button>
              ) : (
                <>
                  <p>
                    <StatusPill tone="teal">
                      <Check size={12} /> Approved for funding
                    </StatusPill>
                  </p>
                  <button
                    className="button button--wide"
                    type="button"
                    disabled={
                      !canWrite || ["creating", "approving", "funding", "complete"].includes(stage)
                    }
                    onClick={deployAndFund}
                  >
                    {["creating", "approving", "funding"].includes(stage) && (
                      <LoaderCircle size={16} className="animate-spin" />
                    )}
                    {stageLabel[stage]}
                  </button>
                  <button
                    className="button button--secondary button--wide"
                    type="button"
                    onClick={downloadAgentMetadata}
                  >
                    Download verified agent metadata
                  </button>
                </>
              )}
              {contestAddress && (
                <>
                  <div className="data-row">
                    <span>Contest contract</span>
                    <strong>{contestAddress}</strong>
                  </div>
                  {stage === "complete" && creationTransaction && (
                    <Link
                      className="button button--secondary button--wide"
                      href={`/lab?contest=${contestAddress}&tx=${creationTransaction.hash}`}
                    >
                      Continue in lifecycle lab
                    </Link>
                  )}
                </>
              )}
              {transactions.length > 0 && (
                <ol className="transaction-steps">
                  {transactions.map((transaction) => (
                    <li key={transaction.hash}>
                      <div>
                        <strong>{transaction.label}</strong>
                        <div>Block {transaction.blockNumber.toString()}</div>
                        <a
                          className="transaction-link"
                          href={transactionExplorerUrl(transaction.hash)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {transaction.hash}
                        </a>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
