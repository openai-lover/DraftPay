export interface SpendingPolicyConfig {
  maxPaymentPerRequestAtomic: bigint;
  maxSessionSpendAtomic: bigint;
  maxDailySpendAtomic: bigint;
  allowedOrigins: string[];
  emergencyDisabled: boolean;
  initialSessionSpendAtomic?: bigint;
  initialDailySpendAtomic?: bigint;
}

export class SpendingPolicy {
  readonly #config: SpendingPolicyConfig;
  #sessionSpend: bigint;
  #dailySpend: bigint;

  constructor(config: SpendingPolicyConfig) {
    this.#config = config;
    this.#sessionSpend = config.initialSessionSpendAtomic ?? 0n;
    this.#dailySpend = config.initialDailySpendAtomic ?? 0n;
  }

  get dailySpend(): bigint {
    return this.#dailySpend;
  }

  get sessionSpend(): bigint {
    return this.#sessionSpend;
  }

  assertCanSpend(url: string, amountAtomic: bigint): void {
    if (this.#config.emergencyDisabled) throw new Error("Agent payments are emergency-disabled");
    const origin = new URL(url).origin;
    if (!this.#config.allowedOrigins.includes(origin))
      throw new Error("Service origin is not allowlisted");
    if (amountAtomic <= 0n) throw new Error("Payment amount must be positive");
    if (amountAtomic > this.#config.maxPaymentPerRequestAtomic) {
      throw new Error("Payment exceeds the per-request limit");
    }
    if (this.#sessionSpend + amountAtomic > this.#config.maxSessionSpendAtomic) {
      throw new Error("Payment exceeds the remaining session limit");
    }
    if (this.#dailySpend + amountAtomic > this.#config.maxDailySpendAtomic) {
      throw new Error("Payment exceeds the remaining daily limit");
    }
  }

  recordVerifiedPayment(amountAtomic: bigint): void {
    if (amountAtomic <= 0n) throw new Error("Verified payment amount must be positive");
    this.#sessionSpend += amountAtomic;
    this.#dailySpend += amountAtomic;
  }
}
