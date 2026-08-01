import { formatUsdc } from "@draftpay/shared";

export function shortAddress(value: string | undefined | null, size = 5): string {
  if (!value) return "Not configured";
  return `${value.slice(0, size + 2)}…${value.slice(-size)}`;
}

export function usdc(value: string | bigint): string {
  return `${formatUsdc(typeof value === "bigint" ? value : BigInt(value))} USDC`;
}

export function displayDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function relativeTime(value: string, now = new Date()): string {
  const elapsedMs = Math.max(0, now.getTime() - new Date(value).getTime());
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1_000));

  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  return `${Math.floor(elapsedHours / 24)}d ago`;
}
