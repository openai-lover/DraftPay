export const USDC_DECIMALS = 6;
export const USDC_SCALE = 1_000_000n;

const USDC_INPUT = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/;

export function parseUsdc(value: string): bigint {
  const normalized = value.trim();
  const match = USDC_INPUT.exec(normalized);
  if (!match) throw new Error("USDC amount must be a non-negative number with at most 6 decimals");
  const whole = BigInt(match[1] ?? "0");
  const fraction = (match[2] ?? "").padEnd(USDC_DECIMALS, "0");
  return whole * USDC_SCALE + BigInt(fraction || "0");
}

export function formatUsdc(value: bigint, options?: { trim?: boolean }): string {
  if (value < 0n) throw new Error("USDC amount cannot be negative");
  const whole = value / USDC_SCALE;
  const fraction = (value % USDC_SCALE).toString().padStart(USDC_DECIMALS, "0");
  const renderedFraction = options?.trim === false ? fraction : fraction.replace(/0+$/, "");
  return renderedFraction.length > 0 ? `${whole}.${renderedFraction}` : whole.toString();
}

export function multiplyBps(value: bigint, basisPoints: number): bigint {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new Error("Basis points must be an integer from 0 through 10,000");
  }
  return (value * BigInt(basisPoints)) / 10_000n;
}
