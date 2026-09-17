import type { MortgageTrack } from "../data/types";

/**
 * CPI-linked tracks are modelled on a real-rate basis: the nominal coupon amortises
 * the loan while the index inflates principal and payment alongside it. Adding the
 * CPI assumption to the coupon gives the effective cost in nominal shekels, which is
 * what makes a linked track comparable to an unlinked one.
 */
export const effectiveRate = (track: MortgageTrack, cpi: number) =>
  track.annualRate + (track.linked ? cpi : 0);

/** Standard annuity (שפיצר) payment. */
export function annuityPayment(principal: number, annualRate: number, years: number) {
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Principal that a given monthly payment can carry. */
export function principalFromPayment(payment: number, annualRate: number, years: number) {
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + r, -n))) / r;
}

export interface TrackResult {
  track: MortgageTrack;
  principal: number;
  rate: number;
  payment: number;
  total: number;
  interest: number;
}

export interface MixResult {
  tracks: TrackResult[];
  principal: number;
  payment: number;
  total: number;
  interest: number;
  blendedRate: number;
  longestYears: number;
}

export function computeMix(
  principal: number,
  tracks: MortgageTrack[],
  cpi: number
): MixResult {
  const shareSum = tracks.reduce((s, t) => s + t.share, 0) || 1;
  const results: TrackResult[] = tracks.map((track) => {
    const share = track.share / shareSum;
    const p = principal * share;
    const rate = effectiveRate(track, cpi);
    const payment = annuityPayment(p, rate, track.years);
    const total = payment * Math.round(track.years * 12);
    return { track, principal: p, rate, payment, total, interest: total - p };
  });

  const payment = results.reduce((s, r) => s + r.payment, 0);
  const total = results.reduce((s, r) => s + r.total, 0);
  const blendedRate = results.reduce(
    (s, r) => s + r.rate * (principal ? r.principal / principal : 0),
    0
  );

  return {
    tracks: results,
    principal,
    payment,
    total,
    interest: total - principal,
    blendedRate,
    longestYears: Math.max(...tracks.map((t) => t.years), 0),
  };
}

/** Bank of Israel mix limits. */
export const MIX_RULES = {
  maxPrime: 2 / 3,
  minFixed: 1 / 3,
  maxVariable: 2 / 3,
};

export interface MixViolation {
  rule: string;
  actual: number;
  limit: number;
}

export function checkMixRules(tracks: MortgageTrack[]): MixViolation[] {
  const sum = tracks.reduce((s, t) => s + t.share, 0) || 1;
  const share = (id: string) => (tracks.find((t) => t.id === id)?.share ?? 0) / sum;

  const prime = share("prime");
  const fixed = share("fixed") + share("fixedLinked");
  const variable = prime + share("varLinked");

  const out: MixViolation[] = [];
  if (prime > MIX_RULES.maxPrime + 1e-6)
    out.push({ rule: "מסלול פריים מוגבל לשני שלישים מהמשכנתא", actual: prime, limit: MIX_RULES.maxPrime });
  if (fixed < MIX_RULES.minFixed - 1e-6)
    out.push({ rule: "לפחות שליש מהמשכנתא חייב להיות בריבית קבועה", actual: fixed, limit: MIX_RULES.minFixed });
  if (variable > MIX_RULES.maxVariable + 1e-6)
    out.push({ rule: "מסלולים משתנים מוגבלים לשני שלישים מהמשכנתא", actual: variable, limit: MIX_RULES.maxVariable });
  return out;
}

export interface AmortRow {
  month: number;
  year: number;
  payment: number;
  interest: number;
  principalPaid: number;
  balance: number;
}

/** Yearly roll-up of the blended amortisation across all tracks. */
export function amortisation(mix: MixResult): AmortRow[] {
  const months = mix.longestYears * 12;
  const balances = mix.tracks.map((t) => t.principal);
  const rows: AmortRow[] = [];
  let accPayment = 0;
  let accInterest = 0;
  let accPrincipal = 0;

  for (let m = 1; m <= months; m++) {
    mix.tracks.forEach((t, i) => {
      if (m > t.track.years * 12 || balances[i] <= 0) return;
      const r = t.rate / 100 / 12;
      const interest = balances[i] * r;
      const principalPaid = Math.min(t.payment - interest, balances[i]);
      balances[i] -= principalPaid;
      accPayment += t.payment;
      accInterest += interest;
      accPrincipal += principalPaid;
    });

    if (m % 12 === 0 || m === months) {
      rows.push({
        month: m,
        year: Math.ceil(m / 12),
        payment: accPayment,
        interest: accInterest,
        principalPaid: accPrincipal,
        balance: Math.max(0, balances.reduce((s, b) => s + b, 0)),
      });
      accPayment = 0;
      accInterest = 0;
      accPrincipal = 0;
    }
  }
  return rows;
}

/** The mix can only move payment and total cost — principal is driven by capital. */
export type Objective = "payment" | "total";

export const TERM_OPTIONS = [15, 20, 25, 30];

/**
 * Searches share allocations on a 5% grid, across the candidate terms, for the mix
 * that minimises the chosen objective while satisfying the Bank of Israel limits.
 * The term is what separates the two objectives: a longer term always lowers the
 * monthly payment and always raises the total interest, so without searching it
 * both objectives collapse onto the same cheapest-rate mix.
 */
export function optimiseMix(
  principal: number,
  tracks: MortgageTrack[],
  cpi: number,
  objective: Objective,
  paymentCeiling?: number,
  terms: number[] = TERM_OPTIONS
): { tracks: MortgageTrack[]; result: MixResult } | null {
  const step = 0.05;
  const steps = Math.round(1 / step);
  interface Candidate {
    tracks: MortgageTrack[];
    result: MixResult;
    score: number;
  }
  // Held in a container: TypeScript does not track assignments made inside `walk`,
  // and a plain `let` would stay narrowed to `null` after the call returns.
  const box: { best: Candidate | null } = { best: null };

  const walk = (index: number, remaining: number, shares: number[], years: number) => {
    if (index === tracks.length - 1) {
      const candidate = tracks.map((t, i) => ({
        ...t,
        years,
        share: i === index ? remaining / steps : shares[i] / steps,
      }));
      if (checkMixRules(candidate).length > 0) return;

      const result = computeMix(principal, candidate, cpi);
      if (paymentCeiling && result.payment > paymentCeiling + 1e-6) return;

      const score = objective === "payment" ? result.payment : result.total;
      if (!box.best || score < box.best.score) box.best = { tracks: candidate, result, score };
      return;
    }
    for (let s = 0; s <= remaining; s++) {
      shares[index] = s;
      walk(index + 1, remaining - s, shares, years);
    }
  };

  for (const years of terms) {
    walk(0, steps, new Array(tracks.length).fill(0), years);
  }
  return box.best ? { tracks: box.best.tracks, result: box.best.result } : null;
}

/** Monthly payment as a share of net household income — the bank's DTI test. */
export const dti = (payment: number, income: number) => (income > 0 ? payment / income : 0);
