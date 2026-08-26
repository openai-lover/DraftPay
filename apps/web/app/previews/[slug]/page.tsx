import { notFound } from "next/navigation";

const previews = {
  northstar: {
    brand: "Ledgerly",
    label: "Finance operations, in order",
    headline: "Close the books without closing your weekend.",
    copy: "One calm workspace for reconciliations, approvals, and every decision behind the close.",
    dark: false,
  },
  mina: {
    brand: "Ledgerly / Ops",
    label: "The operating system for finance",
    headline: "Close the books without closing your weekend.",
    copy: "Give every owner a clear queue, every reviewer complete context, and leadership a close they can trust.",
    dark: false,
  },
  kite: {
    brand: "LEDGERLY",
    label: "Built for decisive finance teams",
    headline: "Close the books without closing your weekend.",
    copy: "Work through exceptions, evidence, and approvals without losing the thread—or another weekend.",
    dark: true,
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
          <a className="preview-button" href="#contact" data-cta>
            Start a clean close
          </a>
        </section>
        <section data-section="pricing">
          <h2>Pricing that scales with clarity</h2>
          <div className="preview-plans">
            <div className="preview-plan">
              <strong>Starter</strong>
              <p>$49 / month</p>
            </div>
            <div className="preview-plan">
              <strong>Scale</strong>
              <p>$129 / month</p>
            </div>
            <div className="preview-plan">
              <strong>Enterprise</strong>
              <p>Let&apos;s talk</p>
            </div>
          </div>
        </section>
        <section className="preview-contact" data-section="contact" id="contact">
          <h2>See your next close in one place.</h2>
          <form>
            <input type="email" aria-label="Work email" placeholder="you@company.com" />
            <button type="submit">Request access</button>
          </form>
        </section>
      </div>
      <footer className="preview-footer">Prepared seeded submission · no external scripts</footer>
    </article>
  );
}
