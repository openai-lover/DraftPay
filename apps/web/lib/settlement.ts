export function winnerPayouts(prize: bigint, qualifiedCount: 1 | 2 | 3): bigint[] {
  const baseWinner = (prize * 9_500n) / 10_000n;
  const otherCount = BigInt(qualifiedCount - 1);
  if (otherCount === 0n) return [prize];
  const perFinalist = (prize - baseWinner) / otherCount;
  return [
    prize - perFinalist * otherCount,
    ...Array.from({ length: Number(otherCount) }, () => perFinalist),
  ];
}

export function noWinnerPayouts(prize: bigint, qualifiedCount: 0 | 1 | 2 | 3): bigint[] {
  const shares = [1_500n, 1_000n, 500n]
    .slice(0, qualifiedCount)
    .map((bps) => (prize * bps) / 10_000n);
  const paid = shares.reduce((total, amount) => total + amount, 0n);
  return [prize - paid, ...shares];
}
