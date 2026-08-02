"use client";

/**
 * DraftPay — "Why Arc" section
 * Drop-in, self-contained. No Tailwind config, no CSS files, no extra deps.
 *
 * Next.js (App Router):  import WhyArc from "@/components/WhyArc";  <WhyArc />
 * Vite / CRA:            same, minus the "use client" line.
 *
 * Fonts: falls back to system stacks if absent. For the intended look add to <head>:
 * <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
 */

import { useState } from "react";

type Venue = "arc" | "l2";

const FACTS: Record<
  Venue,
  {
    venue: string;
    deposit: string;
    fee: string;
    feeUnit: string;
    feeNote: string;
    left: string;
    left2: string | null;
    left2Unit: string;
    assets: string;
    predictability: string;
    stamp: string;
    caption: string;
  }
> = {
  arc: {
    venue: "ARC TESTNET",
    deposit: "100.0031",
    fee: "0.0031",
    feeUnit: "USDC",
    feeNote: "same unit as the prize",
    left: "0.00",
    left2: null,
    left2Unit: "",
    assets: "1",
    predictability: "Fixed",
    stamp: "Closes exactly, in one unit",
    caption:
      "Every line of the contest — deposit, split, fee, refund — is one number in one asset. The contract can guarantee the arithmetic because nothing leaves the denomination.",
  },
  l2: {
    venue: "GENERIC EVM L2",
    deposit: "100.00",
    fee: "0.00021",
    feeUnit: "ETH",
    feeNote: "second asset, floating price",
    left: "0.00",
    left2: "-0.00021",
    left2Unit: "ETH",
    assets: "2",
    predictability: "Floats with ETH",
    stamp: "Cannot close in USDC alone",
    caption:
      "The split still works, but the contest is no longer one object. The client funds a prize in dollars and a fee in something else, and the cost of paying a winner moves with a market they never chose to be in.",
  },
};

const REASONS = [
  {
    kicker: "Deterministic finality",
    title: "Selecting a winner and paying them is one moment, not two.",
    body: (
      <>
        Arc runs Malachite, a Tendermint-derived BFT engine with deterministic
        sub-second finality — there is no confirmation count to wait out and no
        reorg to hedge against. A build contest lives or dies on that instant:
        the client presses <em>Select</em>, and the builder&rsquo;s balance has
        already moved. Arc&rsquo;s public testnet has settled north of 244
        million transactions at roughly half-second finality since October 2025.
      </>
    ),
    wide: true,
  },
  {
    kicker: "Agent Stack & x402",
    title: "An agent's costs and its winnings finally share a ledger.",
    body: (
      <>
        Circle&rsquo;s Agent Stack settles agent spending in USDC down to
        $0.000001. So when an agent buys the data, inference and tooling it needs
        to enter a contest, DraftPay can show its true margin — inputs and prize
        in the same column. That is what makes &ldquo;visible economics&rdquo; a
        number instead of a slogan.
      </>
    ),
    wide: false,
  },
  {
    kicker: "Opt-in privacy",
    title: "Public rule, private outcome.",
    body: (
      <>
        The split has to be auditable or the promise is worthless. A
        builder&rsquo;s individual loss does not. Arc&rsquo;s selectively
        shielded balances let DraftPay publish the rule and the proof while
        keeping each entrant&rsquo;s ranking and payout their own business.
      </>
    ),
    wide: false,
  },
  {
    kicker: "StableFX, EURC, CCTP",
    title: "One contest, builders on four continents, no FX desk.",
    body: (
      <>
        Talent for a build brief is global; treasuries are not. Circle&rsquo;s
        Cross-Chain Transfer Protocol and Gateway let a client fund a contest
        from wherever their USDC already sits, and Arc&rsquo;s built-in RFQ FX
        engine settles a euro-denominated builder in EURC against a dollar prize
        pool, on-chain, around the clock. The contest stays one object.
      </>
    ),
    wide: true,
  },
];

export default function WhyArc() {
  const [venue, setVenue] = useState<Venue>("arc");
  const f = FACTS[venue];

  return (
    <section className="dparc">
      <style>{CSS}</style>
      <div className="dparc-inner">
        <p className="dparc-eyebrow">Why Arc</p>
        <h2 className="dparc-h2">
          The prize is the
          <br />
          only unit.
        </h2>
        <p className="dparc-lede">
          DraftPay makes one promise: the money that goes into a contest is the
          money that comes out, split by a rule the contract enforces. That
          promise is only exactly true on a chain where the fee is denominated
          in the prize.
        </p>

        {/* ── Signature: the ledger test ── */}
        <div className="dparc-test">
          <div className="dparc-testhead">
            <span className="dparc-testlabel">Settle one 100 USDC contest</span>
            <div className="dparc-tabs" role="tablist" aria-label="Settlement venue">
              {(["l2", "arc"] as Venue[]).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={venue === v}
                  className={`dparc-tab${venue === v ? " is-on" : ""}`}
                  onClick={() => setVenue(v)}
                >
                  {v === "arc" ? "Arc" : "General-purpose L2"}
                </button>
              ))}
            </div>
          </div>

          <div className="dparc-testbody">
            <div className="dparc-receipt" data-state={venue} key={venue}>
              <div className="dparc-rhead">
                <span className="dparc-rtitle">Settlement receipt</span>
                <span className="dparc-rmeta">{f.venue}</span>
              </div>

              <div className="dparc-rows">
                <div className="dparc-row dparc-row--in">
                  <span className="dparc-k">Client deposits</span>
                  <span className="dparc-v">
                    <b>{f.deposit}</b> <em>USDC</em>
                  </span>
                </div>

                <div className="dparc-rule" />

                <Row label="Selected winner" value="95.00" unit="USDC" />
                <Row label="Finalist 01" value="2.50" unit="USDC" />
                <Row label="Finalist 02" value="2.50" unit="USDC" />

                <div className="dparc-row dparc-row--fee">
                  <span className="dparc-k">
                    Network fees
                    <i className="dparc-note">{f.feeNote}</i>
                  </span>
                  <span className="dparc-v">
                    <b>{f.fee}</b> <em>{f.feeUnit}</em>
                  </span>
                </div>

                <div className="dparc-rule dparc-rule--dbl" />

                <div className="dparc-row dparc-row--tot">
                  <span className="dparc-k">Unaccounted</span>
                  <span className="dparc-v">
                    <b>{f.left}</b> <em>USDC</em>
                  </span>
                </div>
                {f.left2 && (
                  <div className="dparc-row dparc-row--tot dparc-row--leak2">
                    <span className="dparc-k">&nbsp;</span>
                    <span className="dparc-v">
                      <b>{f.left2}</b> <em>{f.left2Unit}</em>
                    </span>
                  </div>
                )}

                <div className="dparc-row dparc-row--sub">
                  <span className="dparc-k">Assets the client must hold</span>
                  <span className="dparc-v">
                    <b>{f.assets}</b>
                  </span>
                </div>
                <div className="dparc-row dparc-row--sub">
                  <span className="dparc-k">Fee in dollar terms</span>
                  <span className="dparc-v">
                    <b>{f.predictability}</b>
                  </span>
                </div>
              </div>

              <div className="dparc-stamp">
                <span className="dparc-dot" />
                <span>{f.stamp}</span>
              </div>

              <div className="dparc-perf" />
            </div>

            <div className="dparc-read">
              <p className="dparc-readk">What the receipt is showing</p>
              <p className="dparc-caption">{f.caption}</p>
              <p className="dparc-readfoot">
                Switch the venue above. The split never changes; what changes is
                whether the contest can still be described as a single number.
              </p>
            </div>
          </div>
        </div>

        {/* ── Supporting reasons ── */}
        <div className="dparc-grid">
          {REASONS.map((r) => (
            <article
              key={r.kicker}
              className={`dparc-card${r.wide ? " dparc-card--wide" : ""}`}
            >
              <span className="dparc-ck">{r.kicker}</span>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </article>
          ))}
        </div>

        <div className="dparc-timing">
          <p>
            <span>Arc mainnet beta lands this summer.</span> Escrowed,
            rule-based, multi-party payout is not an exotic workload to schedule
            for later — it is the first thing anyone will want to do with
            programmable dollars. DraftPay is building it now so it is ready on
            day one.
          </p>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="dparc-row">
      <span className="dparc-k">{label}</span>
      <span className="dparc-v">
        <b>{value}</b> <em>{unit}</em>
      </span>
    </div>
  );
}

const CSS = `
.dparc{--ink:#0B0E14;--slate:#161B26;--line:#242C3D;--paper:#F2F0E9;--paper-2:#DEDACF;--paper-ink:#1A1D26;--usdc:#2775CA;--settle:#14B88A;--leak:#C0553D;--dim:#8A93A5;--bright:#F2F0E9;--mono:'IBM Plex Mono',ui-monospace,'SFMono-Regular',Menlo,monospace;--sans:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;background:radial-gradient(1100px 520px at 12% -8%,rgba(39,117,202,.16),transparent 62%),var(--ink);color:var(--bright);font-family:var(--sans);padding:clamp(72px,11vw,148px) 24px;-webkit-font-smoothing:antialiased}
.dparc-inner{max-width:1120px;margin:0 auto}
.dparc-eyebrow{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--usdc);margin:0 0 22px;display:flex;align-items:center;gap:12px}
.dparc-eyebrow::after{content:'';height:1px;flex:0 0 56px;background:linear-gradient(90deg,var(--usdc),transparent)}
.dparc-h2{font-size:clamp(2.35rem,5.6vw,4rem);line-height:.97;letter-spacing:-.035em;font-weight:700;margin:0 0 26px;color:var(--bright)}
.dparc-lede{font-size:clamp(1rem,1.5vw,1.16rem);line-height:1.62;color:var(--dim);max-width:60ch;margin:0 0 clamp(44px,6vw,72px)}
.dparc-test{margin-bottom:clamp(56px,7vw,88px)}
.dparc-testhead{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;margin-bottom:18px}
.dparc-testlabel{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}
.dparc-tabs{display:flex;gap:4px;padding:4px;background:var(--slate);border:1px solid var(--line);border-radius:8px}
.dparc-tab{font-family:var(--mono);font-size:12px;letter-spacing:.02em;padding:9px 15px;border-radius:5px;border:0;cursor:pointer;background:transparent;color:var(--dim);transition:background .18s,color .18s}
.dparc-tab:hover{color:var(--bright)}
.dparc-tab.is-on{background:var(--usdc);color:#fff}
.dparc-tab:focus-visible{outline:2px solid var(--usdc);outline-offset:2px}
.dparc-testbody{display:grid;grid-template-columns:minmax(0,660px) minmax(0,1fr);gap:clamp(28px,4vw,52px);align-items:start}
.dparc-receipt{position:relative;background:var(--paper);color:var(--paper-ink);border-radius:3px;padding:30px clamp(22px,3.6vw,40px) 46px;box-shadow:0 28px 70px -24px rgba(0,0,0,.85),0 2px 0 rgba(255,255,255,.05);animation:dparc-flip .34s ease-out}
@keyframes dparc-flip{from{opacity:.45;transform:translateY(4px)}to{opacity:1;transform:none}}
.dparc-rhead{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding-bottom:18px;margin-bottom:20px;border-bottom:1.5px solid var(--paper-ink)}
.dparc-rtitle{font-size:14px;font-weight:600;letter-spacing:-.01em}
.dparc-rmeta{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;color:#6B7182;white-space:nowrap}
.dparc-rows{font-family:var(--mono);font-size:13px}
.dparc-row{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:7px 0}
.dparc-k{color:#575E70}
.dparc-v{font-variant-numeric:tabular-nums;white-space:nowrap}
.dparc-v b{font-weight:600;letter-spacing:-.01em}
.dparc-v em{font-style:normal;color:#8A90A0;font-size:11px;margin-left:3px}
.dparc-row--in .dparc-k,.dparc-row--in .dparc-v b{color:var(--paper-ink);font-weight:600}
.dparc-note{display:block;font-style:normal;font-size:10px;letter-spacing:.04em;color:#8A90A0;margin-top:3px}
.dparc-row--tot .dparc-k{color:var(--paper-ink);font-weight:600}
.dparc-row--sub{padding:5px 0;font-size:11.5px}
.dparc-row--sub .dparc-k,.dparc-row--sub .dparc-v b{color:#7A8091;font-weight:500}
.dparc-rule{height:1px;background:var(--paper-2);margin:10px 0}
.dparc-rule--dbl{height:3px;background:none;margin:12px 0;border-top:1px solid var(--paper-ink);border-bottom:1px solid var(--paper-ink)}
.dparc-receipt[data-state="arc"] .dparc-row--fee .dparc-v b,.dparc-receipt[data-state="arc"] .dparc-row--fee .dparc-v em{color:var(--usdc)}
.dparc-receipt[data-state="arc"] .dparc-stamp{color:var(--settle)}
.dparc-receipt[data-state="arc"] .dparc-dot{background:var(--settle)}
.dparc-receipt[data-state="l2"] .dparc-row--fee .dparc-v b,.dparc-receipt[data-state="l2"] .dparc-row--fee .dparc-v em,.dparc-receipt[data-state="l2"] .dparc-row--leak2 .dparc-v b,.dparc-receipt[data-state="l2"] .dparc-row--leak2 .dparc-v em,.dparc-receipt[data-state="l2"] .dparc-row--sub .dparc-v b{color:var(--leak)}
.dparc-receipt[data-state="l2"] .dparc-stamp{color:var(--leak)}
.dparc-receipt[data-state="l2"] .dparc-dot{background:var(--leak)}
.dparc-stamp{display:inline-flex;align-items:center;gap:9px;margin-top:22px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
.dparc-dot{width:7px;height:7px;border-radius:50%;flex:0 0 7px}
.dparc-perf{position:absolute;left:0;right:0;bottom:-1px;height:12px;background:radial-gradient(circle at 6px 12px,var(--ink) 5.5px,transparent 6px) repeat-x;background-size:12px 12px}
.dparc-read{padding-top:6px}
.dparc-readk{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin:0 0 14px}
.dparc-caption{font-size:15px;line-height:1.68;color:var(--bright);margin:0;border-left:2px solid var(--usdc);padding-left:16px}
.dparc-readfoot{font-size:13.5px;line-height:1.6;color:var(--dim);margin:20px 0 0;padding-left:18px}
.dparc-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.dparc-card{grid-column:span 5;background:var(--ink);padding:clamp(26px,3.2vw,38px)}
.dparc-card--wide{grid-column:span 7}
.dparc-ck{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--usdc);display:block;margin-bottom:16px}
.dparc-card h3{font-size:clamp(1.06rem,1.7vw,1.34rem);line-height:1.28;letter-spacing:-.02em;font-weight:600;margin:0 0 13px;color:var(--bright);max-width:26ch}
.dparc-card p{font-size:14.5px;line-height:1.66;color:var(--dim);margin:0}
.dparc-card em{font-style:normal;color:var(--bright)}
.dparc-timing{margin-top:clamp(40px,5vw,60px)}
.dparc-timing p{font-size:clamp(1rem,1.5vw,1.14rem);line-height:1.62;color:var(--dim);max-width:70ch;margin:0;padding-left:18px;border-left:2px solid var(--usdc)}
.dparc-timing span{color:var(--bright);font-weight:600}
@media (max-width:900px){.dparc-testbody{grid-template-columns:minmax(0,1fr)}}
@media (max-width:820px){.dparc-card,.dparc-card--wide{grid-column:span 12}.dparc-testhead{flex-direction:column;align-items:flex-start}.dparc-tabs{width:100%}.dparc-tab{flex:1}}
@media (prefers-reduced-motion:reduce){.dparc-receipt{animation:none}.dparc *{transition:none!important}}
`;
