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
