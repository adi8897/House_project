export type CategoryId =
  | "kabala"
  | "migrash"
  | "tashtiot"
  | "agrot"
  | "baaleyMiktzoa"
  | "halbashot"
  | "bniya"
  | "rezerva";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  /** Slot index into the validated categorical palette (0-based, fixed order). */
  slot: number;
  /** Excluded from the project total — it is a risk buffer, not a line item. */
  isReserve?: boolean;
}

export interface BudgetLine {
  id: string;
  categoryId: CategoryId;
  name: string;
  amount: number;
  note?: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  categoryId: CategoryId;
  name: string;
  payee?: string;
  note?: string;
  receiptIds?: string[];
}

export interface PlannedExpense {
  id: string;
  categoryId: CategoryId;
  name: string;
  amount: number;
  payee?: string;
  expectedDate?: string;
  /** Amount is not yet known — shown as "?" and excluded from planned sums. */
  unknown?: boolean;
  note?: string;
}

export interface CapitalSource {
  id: string;
  name: string;
  owner: "eyal" | "adi" | "joint";
  amount: number;
  /** 0–1. Share of the amount usable for the project right now. */
  usable: number;
  kind: "cash" | "fund" | "pension" | "gift" | "loan" | "future";
  note?: string;
  /** Value for the same source in the short spreadsheet, when the two disagree. */
  altAmount?: number;
}

export interface MortgageTrack {
  id: string;
  name: string;
  shortName: string;
  share: number;
  annualRate: number;
  /** CPI-linked tracks accrue the index on top of the nominal rate. */
  linked: boolean;
  years: number;
  slot: number;
}

export interface Settings {
  projectName: string;
  monthlySavings: number;
  monthsToSave: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  /** Current rent — stops once they move in, so it frees up for the mortgage. */
  currentRent: number;
  desiredRepayment: number;
  cpiAssumption: number;
  primeRate: number;
  buildSizeSqm: number;
  buildCostPerSqm: number;
  maxBuildSizeSqm: number;
  netNeedSqm: number;
  pensionGap: number;
  bankDtiCap: number;
}

export interface AppState {
  settings: Settings;
  budgetLines: BudgetLine[];
  expenses: Expense[];
  planned: PlannedExpense[];
  capital: CapitalSource[];
  tracks: MortgageTrack[];
}

export interface ReceiptMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
  expenseId?: string;
  categoryId?: CategoryId;
  amount?: number;
}
