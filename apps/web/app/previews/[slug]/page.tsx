import { notFound } from "next/navigation";

const previews = {
  northstar: {
    brand: "Ledgerly",
    label: "Finance operations, in order",
    headline: "Close the books without closing your weekend.",
    copy: "One calm workspace for reconciliations, approvals, and every decision behind the close.",
    dark: false,
    proof: false,
  },
  mina: {
    brand: "Ledgerly / Ops",
    label: "The operating system for finance",
    headline: "Close the books without closing your weekend.",
    copy: "Give every owner a clear queue, every reviewer complete context, and leadership a close they can trust.",
    dark: false,
    proof: false,
  },
  kite: {
    brand: "LEDGERLY",
    label: "Built for decisive finance teams",
    headline: "Close the books without closing your weekend.",
    copy: "Work through exceptions, evidence, and approvals without losing the thread—or another weekend.",
    dark: true,
    proof: false,
  },
  arcpay: {
    brand: "ARCPAY / OPS",
    label: "Arc Testnet operations · no real funds",
    headline: "Ship programmable USDC operations with proof.",
    copy: "Create outcome-based work, verify every decision, and settle test USDC through one observable operating console.",
    dark: true,
    proof: true,
  },
} as const;

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preview = previews[slug as keyof typeof previews];
  if (!preview) notFound();
  return (
    <article className={`preview-page${preview.dark ? " preview-page--dark" : ""}`}>
      <nav className="preview-nav">
        <strong>{preview.brand}</strong>
        <span>{preview.label}</span>
      </nav>
      <div className="preview-main">
        <section className="preview-hero" data-section="hero">
          <h1>{preview.headline}</h1>
          <p>{preview.copy}</p>
          <a
            className="preview-button"
            href={
              preview.proof
                ? "/lab?contest=0x766f1259aaCE0b2911f654933a712745591F9cEC&tx=0xf07e9f38b11fcac2f3e95d0e4de17a8c0bff83b7aeddc849ff687b9ae16e03d5"
                : "#contact"
            }
            data-cta
          >
            {preview.proof ? "Inspect the live Arc contest" : "Start a clean close"}
          </a>
        </section>
        <section data-section="pricing">
          <h2>
            {preview.proof
              ? "Testnet plans for programmable operations"
              : "Pricing that scales with clarity"}
          </h2>
          <div className="preview-plans">
            <div className="preview-plan">
              <strong>{preview.proof ? "Builder" : "Starter"}</strong>
              <p>{preview.proof ? "Free · testnet" : "$49 / month"}</p>
            </div>
            <div className="preview-plan">
              <strong>{preview.proof ? "Operator" : "Scale"}</strong>
              <p>{preview.proof ? "5 test USDC / run" : "$129 / month"}</p>
            </div>
            <div className="preview-plan">
              <strong>{preview.proof ? "Protocol" : "Enterprise"}</strong>
              <p>{preview.proof ? "Custom test flow" : "Let's talk"}</p>
            </div>
          </div>
        </section>
        {preview.proof && (
          <section className="preview-contact" data-section="settlement-proof">
            <h2>Live settlement proof</h2>
            <p>
              Contract state, artifact hashes, evaluation decisions, finalist ranking, and payout
              receipts remain linked to Arc Testnet from brief to settlement.
            </p>
          </section>
        )}
        <section className="preview-contact" data-section="contact" id="contact">
          <h2>
            {preview.proof
              ? "Bring a settlement workflow to Arc Testnet."
              : "See your next close in one place."}
          </h2>
          <form>
            <input type="email" aria-label="Work email" placeholder="you@company.com" />
            <button type="submit">
              {preview.proof ? "Request testnet access" : "Request access"}
            </button>
          </form>
        </section>
      </div>
      <footer className="preview-footer">
        {preview.proof
          ? "Arc Testnet demo artifact · test USDC only · no external scripts"
          : "Prepared seeded submission · no external scripts"}
      </footer>
    </article>
  );
}
