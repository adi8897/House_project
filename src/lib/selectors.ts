import type { AppState, BudgetLine, CategoryId, Settings } from "../data/types";
import { billableSqm } from "../data/types";
import { CATEGORIES } from "../data/seed";
import { annuityPayment, computeMix, principalFromPayment } from "./mortgage";

/** Categories the reserve is calculated over — the booklet's SUM(E3:E8), which skips קבלה. */
const RESERVE_BASE: CategoryId[] = [
  "migrash",
  "tashtiot",
  "agrot",
  "baaleyMiktzoa",
  "halbashot",
  "bniya",
];

export const buildCost = (s: Settings) => billableSqm(s) * s.buildCostPerSqm;

/** A line's effective amount: derived lines ignore their stored value. */
export function lineAmount(line: BudgetLine, settings: Settings): number {
  return line.derivedFrom === "build" ? buildCost(settings) : line.amount;
}

export interface CategoryRollup {
  id: CategoryId;
  name: string;
  description: string;
  slot: number;
  isReserve: boolean;
  budget: number;
  spent: number;
  planned: number;
  remaining: number;
  /** Remaining that is not yet covered by a planned expense line. */
  unplanned: number;
  /** Amount spent beyond the category's budget. */
  overspend: number;
  progress: number;
}

export function rollupCategories(state: AppState): CategoryRollup[] {
  const rows = CATEGORIES.map((cat) => {
    const budget = state.budgetLines
      .filter((l) => l.categoryId === cat.id)
      .reduce((s, l) => s + lineAmount(l, state.settings), 0);
    const spent = state.expenses
      .filter((e) => e.categoryId === cat.id)
      .reduce((s, e) => s + e.amount, 0);
    const planned = state.planned
      .filter((p) => p.categoryId === cat.id && !p.unknown)
      .reduce((s, p) => s + p.amount, 0);
    const remaining = budget - spent;
    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      slot: cat.slot,
      isReserve: Boolean(cat.isReserve),
      budget,
      spent,
      planned,
      remaining,
      unplanned: Math.max(0, remaining - planned),
      overspend: Math.max(0, -remaining),
      progress: budget > 0 ? Math.min(1, spent / budget) : 0,
    };
  });

  // The reserve is a share of what is still left to spend, so it shrinks as the
  // project is paid down — and it has to be computed after the other rows exist.
  const base = rows
    .filter((r) => RESERVE_BASE.includes(r.id))
    .reduce((s, r) => s + r.remaining, 0);
  const reserveRow = rows.find((r) => r.isReserve);
  if (reserveRow) {
    reserveRow.budget = base * state.settings.reserveRate;
    reserveRow.remaining = reserveRow.budget - reserveRow.spent;
    reserveRow.unplanned = Math.max(0, reserveRow.remaining - reserveRow.planned);
    reserveRow.progress =
      reserveRow.budget > 0 ? Math.min(1, reserveRow.spent / reserveRow.budget) : 0;
  }

  return rows;
}

export interface Totals {
  totalCost: number;
  spent: number;
  remaining: number;
  reserve: number;
  capitalNow: number;
  liquidCapital: number;
  potentialCapital: number;
  futureCapital: number;
  savedOverHorizon: number;
  monthlySavings: number;
  potentialMonthlySaving: number;
  maxRepayment: number;
  possibleMortgage: number;
  requiredMortgage: number;
  totalAvailable: number;
  surplus: number;
  reserveGap: number;
  progress: number;
}

export function computeTotals(state: AppState): Totals {
  const rows = rollupCategories(state);
  const project = rows.filter((r) => !r.isReserve);
  const reserve = rows.find((r) => r.isReserve)?.budget ?? 0;

  const totalCost = project.reduce((s, r) => s + r.budget, 0);
  const spent = project.reduce((s, r) => s + r.spent, 0);
  const remaining = totalCost - spent;

  const capitalNow = state.capital.reduce((s, c) => s + c.amount * c.usable, 0);
  const futureCapital = state.capital.reduce((s, c) => s + c.amount * (1 - c.usable), 0);

  const {
    monthlySavings,
    monthsToSave,
    monthlyIncome,
    monthlyExpenses,
    desiredRepayment,
    currentRent,
  } = state.settings;

  // The booklet's "הון נזיל לתהליך" counts the savings horizon alongside the balances
  // held today, which is what makes its 993,356 ₪ reconcile.
  const savedOverHorizon = monthlySavings * monthsToSave;
  const liquidCapital = capitalNow + savedOverHorizon;
  const potentialCapital = liquidCapital + futureCapital;

  const potentialMonthlySaving = monthlyIncome - monthlyExpenses;
  // Rent stops once they move in, so it frees up for the mortgage on top of the surplus.
  const maxRepayment = potentialMonthlySaving + currentRent;

  const mix = computeMix(1, state.tracks, state.settings.cpiAssumption);
  const possibleMortgage = principalFromPayment(
    desiredRepayment,
    mix.blendedRate,
    mix.longestYears
  );

  // Money already spent came out of capital, so it is not double-counted here.
  const requiredMortgage = Math.max(0, remaining - liquidCapital);
  const totalAvailable = spent + liquidCapital + possibleMortgage;
  const surplus = totalAvailable - totalCost;

  return {
    totalCost,
    spent,
    remaining,
    reserve,
    capitalNow,
    liquidCapital,
    potentialCapital,
    futureCapital,
    savedOverHorizon,
    monthlySavings,
    potentialMonthlySaving,
    maxRepayment,
    possibleMortgage,
    requiredMortgage,
    totalAvailable,
    surplus,
    reserveGap: reserve - surplus,
    progress: totalCost > 0 ? spent / totalCost : 0,
  };
}

/** Cumulative spend over time, for the burn-up chart. */
export function spendTimeline(state: AppState) {
  const sorted = [...state.expenses].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const actual = sorted.map((e) => {
    running += e.amount;
    return { date: e.date, cumulative: running, label: e.name, amount: e.amount };
  });

  const plannedSorted = [...state.planned]
    .filter((p) => !p.unknown && p.expectedDate)
    .sort((a, b) => (a.expectedDate ?? "").localeCompare(b.expectedDate ?? ""));

  let projected = running;
  const forecast = plannedSorted.map((p) => {
    projected += p.amount;
    return { date: p.expectedDate as string, projected, label: p.name, amount: p.amount };
  });

  return { actual, forecast };
}

/** What the monthly payment would be if the whole remaining gap were financed. */
export function repaymentForRequired(state: AppState) {
  const totals = computeTotals(state);
  const mix = computeMix(1, state.tracks, state.settings.cpiAssumption);
  return annuityPayment(totals.requiredMortgage, mix.blendedRate, mix.longestYears);
}
