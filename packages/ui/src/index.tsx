import type { HTMLAttributes, ReactNode } from "react";

export function EvidenceBadge({ mode }: { mode: "fixture" | "real" }) {
  return (
    <span className={`evidence-badge evidence-badge--${mode}`}>
      {mode === "real" ? "Verified onchain" : "Seeded demo"}
    </span>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "teal" | "amber";
}) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}

export function DataRow({
  label,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { label: string; children: ReactNode }) {
  return (
    <div className="data-row" {...props}>
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}
