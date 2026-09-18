import type { AppState } from "../data/types";
import { buildCost, computeTotals, rollupCategories } from "./selectors";
import { annuityPayment, computeMix, dti, principalFromPayment } from "./mortgage";

export type Impact = "principal" | "payment" | "risk";
export type Severity = "critical" | "serious" | "warning" | "good";

export interface Recommendation {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  impact: Impact[];
  /** Shekels removed from the mortgage principal if acted on. */
  principalSaving?: number;
  /** Shekels off the monthly payment if acted on. */
  paymentSaving?: number;
  action?: string;
}

export function buildRecommendations(state: AppState): Recommendation[] {
  const t = computeTotals(state);
  const s = state.settings;
  const mix = computeMix(1, state.tracks, s.cpiAssumption);
  const out: Recommendation[] = [];

  const perShekel = (amount: number) =>
    annuityPayment(amount, mix.blendedRate, mix.longestYears);

  // 1 — Reserve vs surplus. The booklet keeps the reserve outside the total, so a
  // surplus smaller than the reserve is an unfunded risk buffer, not spare cash.
  if (t.reserveGap > 0) {
    out.push({
      id: "reserve",
      title: "הרזרבה לא מכוסה במלואה",
      body: `החוברת מחשבת רזרבת סיכון של ${fmt(t.reserve)} להוצאות לא צפויות ועליית מחירים, אבל היא לא נכללת בסך עלות הפרויקט. העודף שנשאר לכם אחרי כל העלויות הוא ${fmt(t.surplus)} — כלומר חסרים ${fmt(t.reserveGap)} כדי לכסות את הרזרבה במלואה. זה הפער הכי חשוב לסגור, כי הוא זה שמונע חריגה באמצע הבניה.`,
      severity: t.reserveGap > t.reserve * 0.3 ? "critical" : "serious",
      impact: ["risk"],
      principalSaving: t.reserveGap,
      action: `להשלים ${fmt(t.reserveGap)} — בחיסכון, בדחיית הבניה, או בהקטנת הבית`,
    });
  } else {
    out.push({
      id: "reserve",
      title: "הרזרבה מכוסה",
      body: `העודף שלכם (${fmt(t.surplus)}) גדול מהרזרבה הנדרשת (${fmt(t.reserve)}). זה המצב שאליו רוצים להגיע לפני שמתחילים לבנות.`,
      severity: "good",
      impact: ["risk"],
    });
  }

  // 2 — Categories spent past their budget.
  const over = rollupCategories(state).filter((r) => !r.isReserve && r.overspend > 0);
  for (const cat of over) {
    out.push({
      id: `over-${cat.id}`,
      title: `חריגה בקטגוריית ${cat.name}`,
      body: `שילמתם ${fmt(cat.spent)} מול תקציב של ${fmt(cat.budget)} — חריגה של ${fmt(cat.overspend)}. החריגה לא מגדילה את סה״כ הפרויקט בחוברת, אבל היא כן אומרת שהכסף הזה יצא ממקום אחר. צריך להחליט: להעלות את תקציב הקטגוריה (ואז סך הפרויקט גדל), או לקזז מקטגוריה אחרת.`,
      severity: "serious",
      impact: ["risk"],
      action: `לעדכן את תקציב ${cat.name} או לקזז מקטגוריה אחרת`,
    });
  }

  // 3 — Build size. The single biggest lever in the budget.
  const netDelta = s.houseSqm - s.netNeedSqm;
  if (netDelta > 0.5) {
    // Only the indoor area moves; the balcony stays and keeps its weighted cost.
    const saving = netDelta * s.buildCostPerSqm;
    out.push({
      id: "sqm-net",
      title: `הצורך הנטו שחישבתם הוא ${round(s.netNeedSqm)} מ״ר, והתקציב בנוי ל-${round(s.houseSqm)}`,
      body: `שורת הבניה מחושבת כ-(${round(s.houseSqm)} מ״ר בית + ${pct(s.balconyWeight)} מ-${round(s.balconySqm)} מ״ר מרפסת) × ${fmt(s.buildCostPerSqm)} למ״ר = ${fmt(buildCost(s))}. סכימת החדרים שאתם באמת צריכים מגיעה ל-${round(s.netNeedSqm)} מ״ר בלבד. הקטנת הבית לגודל הזה חוסכת ${fmt(saving)} ומורידה ${fmt(perShekel(saving))} מההחזר החודשי — זה המנוף הגדול ביותר בתקציב.`,
      severity: "warning",
      impact: ["principal", "payment"],
      principalSaving: saving,
      paymentSaving: perShekel(saving),
      action: `לרדת מ-${round(s.houseSqm)} ל-${round(s.netNeedSqm)} מ״ר`,
    });
  }

  // 3 — DTI. The bank's cap can bind before the household's own ceiling does.
  const bankCeiling = s.monthlyIncome * s.bankDtiCap;
  if (s.desiredRepayment > bankCeiling) {
    out.push({
      id: "dti",
      title: "ההחזר הרצוי חורג מתקרת הבנק",
      body: `בנקים מגבילים את ההחזר החודשי ל-${pct(s.bankDtiCap)} מההכנסה נטו. עם הכנסה של ${fmt(s.monthlyIncome)} התקרה היא ${fmt(bankCeiling)}, וההחזר הרצוי שרשמתם הוא ${fmt(s.desiredRepayment)}. תצטרכו להוריד את ההחזר או להגדיל הון עצמי.`,
      severity: "critical",
      impact: ["payment"],
      action: `להוריד את ההחזר אל מתחת ל-${fmt(bankCeiling)}`,
    });
  } else if (t.maxRepayment > bankCeiling) {
    out.push({
      id: "dti",
      title: "יכולת ההחזר שלכם גבוהה מתקרת הבנק",
      body: `לפי התזרים אתם יכולים להחזיר עד ${fmt(t.maxRepayment)} בחודש, אבל הבנק לא יאשר מעבר ל-${pct(s.bankDtiCap)} מההכנסה — ${fmt(bankCeiling)}. זו לא בעיה: זה אומר שיש לכם כרית ביטחון אמיתית מעבר למה שהבנק יראה. שמרו על ההפרש כחיסכון ולא כהוצאה, והוא יהפוך לרזרבה של הפרויקט.`,
      severity: "good",
      impact: ["risk"],
    });
  }

  // 4 — Non-liquid savings vehicles.
  const locked = state.capital.filter((c) => c.usable < 1 && c.kind === "pension");
  const lockedSum = locked.reduce((sum, c) => sum + c.amount * (1 - c.usable), 0);
  if (lockedSum > 0) {
    out.push({
      id: "locked",
      title: "כספי השתלמות שלא נספרו כהון",
      body: `${locked.map((c) => c.name).join(" ו")} מסתכמים ב-${fmt(lockedSum)} ולא נכנסו לחישוב ההון הנזיל. שווה לברר מול הגופים את מועדי הנזילות המדויקים — אם אחת מהן כבר נזילה, זה כסף שמקטין ישירות את המשכנתא ומוריד ${fmt(perShekel(lockedSum))} מההחזר החודשי.`,
      severity: "warning",
      impact: ["principal"],
      principalSaving: lockedSum,
      paymentSaving: perShekel(lockedSum),
      action: "לברר מועדי נזילות מול מיטב דש וכלל",
    });
  }

  // 5 — Future money.
  const future = state.capital.filter((c) => c.kind === "future" && c.usable < 1);
  const futureSum = future.reduce((sum, c) => sum + c.amount * (1 - c.usable), 0);
  if (futureSum > 0) {
    out.push({
      id: "future",
      title: "עיתוי כניסת הכסף העתידי הוא המנוף הגדול",
      body: `${fmt(futureSum)} צפויים להיכנס מבונוסים ומתוכניות המניות של SolarEdge לאורך 4 השנים הקרובות. אם הכסף ייכנס לפני לקיחת המשכנתא — הוא מקטין את הקרן ומוריד ${fmt(perShekel(futureSum))} בחודש. אם ייכנס אחריה — הוא ישמש לפירעון מוקדם, שעדיין משתלם אבל פחות. שווה לתזמן את מועד לקיחת המשכנתא סביב מועדי ההבשלה (vesting).`,
      severity: "warning",
      impact: ["principal", "payment"],
      principalSaving: futureSum,
      paymentSaving: perShekel(futureSum),
      action: "למפות מועדי הבשלה ולתזמן מולם את המשכנתא",
    });
  }

  // 6 — Pension gap is a real obligation absent from the project budget.
  if (s.pensionGap > 0) {
    out.push({
      id: "pension",
      title: "השלמת פנסיה שלא נמצאת בתקציב הפרויקט",
      body: `הבדיקה הביטוחית והפנסיונית מצאה צורך בהשלמה של ${fmt(s.pensionGap)}. הסכום הזה לא מופיע באף אחת מ-8 הקטגוריות של התקציב, אבל הוא התחייבות אמיתית. אם תממנו אותו מההון העצמי, הוא יקטין את מה שנשאר לבניה ויגדיל את המשכנתא ב-${fmt(perShekel(s.pensionGap))} בחודש.`,
      severity: "serious",
      impact: ["risk", "principal"],
      action: "להחליט אם מממנים את ההשלמה לפני או אחרי הבניה",
    });
  }

  // 7 — Family loan instead of bank debt.
  const familyLoan = state.capital.find((c) => c.id === "c10");
  if (familyLoan && familyLoan.amount === 0) {
    const example = 200000;
    out.push({
      id: "family-loan",
      title: "הלוואה משפחתית במקום חלק מהמשכנתא",
      body: `היועצים שלכם ממליצים לשקול הלוואה מההורים לצד המתנה. כל ${fmt(example)} שתיקחו כהלוואה משפחתית במקום מהבנק חוסכים כ-${fmt(perShekel(example) * mix.longestYears * 12 - example)} בריבית לאורך ${mix.longestYears} שנה, ומורידים ${fmt(perShekel(example))} מההחזר החודשי. חשוב להסדיר בכתב — סכום, לוח סילוקין וריבית, כדי שהבנק יכיר בזה ושלא ייווצרו אי-הבנות במשפחה.`,
      severity: "warning",
      impact: ["principal", "payment"],
      action: "לברר מול המשפחה ולהסדיר בהסכם כתוב",
    });
  }

  // 8 — Purchase-tax refund.
  const purchaseTax = state.budgetLines.find((l) => l.id === "b-a1");
  if (purchaseTax) {
    const refund = purchaseTax.amount / 6;
    out.push({
      id: "tax-refund",
      title: "החזר שישית ממס הרכישה",
      body: `מס הרכישה בתקציב הוא ${fmt(purchaseTax.amount)}, וניתן לקבל שישית ממנו בחזרה — ${fmt(refund)} — אם יש בידכם היתר בניה בתוך שנתיים מיום התשלום. זה לא סכום גדול, אבל הוא תלוי אך ורק בלוח הזמנים של ההיתר, ולכן כדאי לשים אותו כיעד בלוח הזמנים ולא לפספס אותו.`,
      severity: "warning",
      impact: ["principal", "risk"],
      principalSaving: refund,
      action: "לוודא היתר בניה בתוך שנתיים מתשלום המס",
    });
  }

  // 9 — Saving horizon.
  if (s.monthlySavings > 0) {
    const extra = 1000;
    out.push({
      id: "savings",
      title: "כל 1,000 ₪ נוספים בחודש",
      body: `אתם חוסכים ${fmt(s.monthlySavings)} בחודש, ומתכננים ${s.monthsToSave} חודשי חיסכון — סך הכל ${fmt(t.savedOverHorizon)}. התזרים שלכם מראה פוטנציאל חיסכון של ${fmt(t.potentialMonthlySaving)} בחודש, כלומר יש מרווח. כל ${fmt(extra)} נוספים בחודש מוסיפים ${fmt(extra * s.monthsToSave)} להון עד תחילת הבניה, ומורידים ${fmt(perShekel(extra * s.monthsToSave))} מההחזר החודשי.`,
      severity: "good",
      impact: ["principal"],
      principalSaving: extra * s.monthsToSave,
      paymentSaving: perShekel(extra * s.monthsToSave),
      action: `להעלות את ההפקדה הקבועה מ-${fmt(s.monthlySavings)} ל-${fmt(s.monthlySavings + extra)}`,
    });
  }

  const order: Record<Severity, number> = { critical: 0, serious: 1, warning: 2, good: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

export interface ScenarioMix {
  payment: number;
  total: number;
  blendedRate: number;
  principal: number;
  years: number;
}

export interface Scenario {
  id: "payment" | "principal" | "total";
  label: string;
  description: string;
  principal: number;
  payment: number;
  totalPaid: number;
  interest: number;
  blendedRate: number;
  years: number;
  dtiShare: number;
  tradeoff: string;
}

/** The three optimisation targets, evaluated side by side. */
export function buildScenarios(
  state: AppState,
  lowestPaymentMix: ScenarioMix | null,
  lowestTotalMix: ScenarioMix | null
): Scenario[] {
  const t = computeTotals(state);
  const s = state.settings;
  const mix = computeMix(1, state.tracks, s.cpiAssumption);
  const years = mix.longestYears;

  const scenarios: Scenario[] = [];

  if (lowestPaymentMix) {
    scenarios.push({
      id: "payment",
      label: "החזר חודשי נמוך",
      description: "תמהיל שמזעיר את הסכום שיוצא מהחשבון כל חודש",
      principal: lowestPaymentMix.principal,
      payment: lowestPaymentMix.payment,
      totalPaid: lowestPaymentMix.total,
      interest: lowestPaymentMix.total - lowestPaymentMix.principal,
      blendedRate: lowestPaymentMix.blendedRate,
      years: lowestPaymentMix.years,
      dtiShare: dti(lowestPaymentMix.payment, s.monthlyIncome),
      tradeoff: `פורס את ההחזר על ${lowestPaymentMix.years} שנה ונשען על הריביות הנמוכות שיש היום. ההחזר החודשי נוח, אבל משלמים ${fmt(lowestPaymentMix.total - lowestPaymentMix.principal)} ריבית — וככל שיש מסלולים צמודים, יש חשיפה לעליית המדד.`,
    });
  }

  if (lowestTotalMix) {
    scenarios.push({
      id: "total",
      label: "עלות כוללת נמוכה",
      description: "תמהיל שמזעיר את סך הריבית לאורך כל חיי המשכנתא",
      principal: lowestTotalMix.principal,
      payment: lowestTotalMix.payment,
      totalPaid: lowestTotalMix.total,
      interest: lowestTotalMix.total - lowestTotalMix.principal,
      blendedRate: lowestTotalMix.blendedRate,
      years: lowestTotalMix.years,
      dtiShare: dti(lowestTotalMix.payment, s.monthlyIncome),
      tradeoff: `מקצר את התקופה ל-${lowestTotalMix.years} שנה: משלמים ${fmt(lowestTotalMix.payment)} בחודש במקום פחות, וחוסכים ריבית. דורש תזרים חודשי חזק ומשאיר פחות מקום להפתעות.`,
    });
  }

  // Lowest principal: act on every lever that removes shekels from the loan.
  const leverage = totalLeverage(buildRecommendations(state));
  const reducedPrincipal = Math.max(0, t.requiredMortgage - leverage);
  const reducedPayment = annuityPayment(reducedPrincipal, mix.blendedRate, years);

  scenarios.push({
    id: "principal",
    label: "סכום משכנתא נמוך",
    description: "מימוש כל יעדי ההון לפני לקיחת המשכנתא",
    principal: reducedPrincipal,
    payment: reducedPayment,
    totalPaid: reducedPayment * years * 12,
    interest: reducedPayment * years * 12 - reducedPrincipal,
    blendedRate: mix.blendedRate,
    years,
    dtiShare: dti(reducedPayment, s.monthlyIncome),
    tradeoff: `מצריך לממש ${fmt(leverage)} ביעדים — הקטנת הבית, שחרור כספי השתלמות, תזמון הכסף העתידי והגדלת החיסכון. הכי משתלם, והכי תלוי בכם ובלוח הזמנים.`,
  });

  return scenarios;
}

/** Levers that would double-count the same shekels if selected together. */
export const EXCLUSIVE_GROUPS: string[][] = [];

export function conflictsWith(id: string): string[] {
  return EXCLUSIVE_GROUPS.filter((g) => g.includes(id)).flatMap((g) =>
    g.filter((x) => x !== id)
  );
}

/** Sum of every principal lever, keeping only the largest of each exclusive group. */
export function totalLeverage(recs: Recommendation[]): number {
  const eligible = recs.filter(
    (r) => r.impact.includes("principal") && r.principalSaving && r.id !== "reserve"
  );
  const dropped = new Set<string>();
  for (const group of EXCLUSIVE_GROUPS) {
    const members = eligible.filter((r) => group.includes(r.id));
    if (members.length < 2) continue;
    const keep = members.reduce((a, b) =>
      (a.principalSaving ?? 0) >= (b.principalSaving ?? 0) ? a : b
    );
    members.filter((m) => m.id !== keep.id).forEach((m) => dropped.add(m.id));
  }
  return eligible
    .filter((r) => !dropped.has(r.id))
    .reduce((sum, r) => sum + (r.principalSaving ?? 0), 0);
}

/** The required mortgage if a set of goals is met. */
export function principalAfterGoals(state: AppState, savings: number) {
  const t = computeTotals(state);
  const principal = Math.max(0, t.requiredMortgage - savings);
  const mix = computeMix(principal, state.tracks, state.settings.cpiAssumption);
  const unit = computeMix(1, state.tracks, state.settings.cpiAssumption);
  return {
    principal,
    payment: mix.payment,
    maxPrincipal: principalFromPayment(
      state.settings.desiredRepayment,
      unit.blendedRate,
      unit.longestYears
    ),
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 })
    .format(Math.round(n));
const pct = (n: number) => `${Math.round(n * 100)}%`;
const round = (n: number) => Math.round(n * 10) / 10;
