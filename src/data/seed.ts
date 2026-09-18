import type {
  AppState,
  BudgetLine,
  CapitalSource,
  Category,
  Expense,
  MortgageTrack,
  PlannedExpense,
  Settings,
} from "./types";

/**
 * Slot order is the CVD-safety mechanism from the palette validation, not cosmetic.
 * Re-ordering requires re-running the palette validator in both light and dark modes.
 */
export const CATEGORIES: Category[] = [
  { id: "kabala", name: "קבלה", description: "עלויות ההתקבלות לניר דוד", slot: 0 },
  { id: "migrash", name: "מגרש", description: "דמי היוון עבור הזכות על הקרקע", slot: 1 },
  { id: "tashtiot", name: "תשתיות", description: "תשתיות ציבוריות עד למגרש", slot: 2 },
  { id: "agrot", name: "אגרות ומיסים", description: "מיסים, אגרות, היטלים ותשלומי חובה", slot: 3 },
  { id: "baaleyMiktzoa", name: "בעלי מקצוע", description: "אדריכל, מהנדס, פיקוח וייעוץ כלכלי", slot: 4 },
  { id: "halbashot", name: "אבזור והלבשות", description: "מערכות, גמרים, מטבח, חוץ והלבשות", slot: 5 },
  { id: "bniya", name: "בניה", description: "בניה ערומה לפי שיטת הבניה הנבחרת", slot: 6 },
  { id: "rezerva", name: "רזרבה", description: "מדד סיכון לעליית מחירים והוצאות לא מתוכננות", slot: 7, isReserve: true },
];

export const BUDGET_LINES: BudgetLine[] = [
  // קבלה — סה"כ 84,233
  { id: "b-k1", categoryId: "kabala", name: "דמי הרשמה", amount: 5000 },
  { id: "b-k2", categoryId: "kabala", name: "דמי הצטרפות לאגודה", amount: 50000 },
  { id: "b-k3", categoryId: "kabala", name: "תקורות תהליך הקליטה", amount: 25000, note: "כולל הוצאות משפטיות ותקורות" },
  { id: "b-k4", categoryId: "kabala", name: "הסכם שירותים", amount: 0, note: "כולל הוצאות משפטיות ותקורות" },
  { id: "b-k5", categoryId: "kabala", name: "אבחון כלכלי", amount: 2018 },
  { id: "b-k6", categoryId: "kabala", name: "אבחון חברתי", amount: 2000 },
  { id: "b-k7", categoryId: "kabala", name: "רישום תיק מידע", amount: 215 },

  // מגרש — 214,760
  { id: "b-m1", categoryId: "migrash", name: "דמי היוון רמ״י", amount: 214760, note: "שווי מקור 700,000 ₪ · הנחת אזור עדיפות א׳ ‎-345,000 · הנחת מילואים ‎-35,000 · הנחת מחוסרי דיור ‎-138,000 · מע״מ 18%" },

  // תשתיות — 300,000
  { id: "b-t1", categoryId: "tashtiot", name: "עלות פיתוח ציבורי", amount: 310000 },
  { id: "b-t2", categoryId: "tashtiot", name: "השוואת תשתיות ישנות", amount: 15000 },
  { id: "b-t3", categoryId: "tashtiot", name: "התאמה לסה״כ שנקבע בחוברת", amount: -25000, note: "החוברת מסכמת את התשתיות ב-300,000 ₪ · 45% ביצוע תשתיות ציבוריות" },

  // אגרות ומיסים — 90,646.35
  { id: "b-a1", categoryId: "agrot", name: "מס רכישה (מגרש + תשתיות)", amount: 20985.6, note: "6% · ניתן לקבל 1/6 בחזרה אם יש היתר בניה ביד עד שנתיים מהתשלום" },
  { id: "b-a2", categoryId: "agrot", name: "חיבור חשמל", amount: 9340 },
  { id: "b-a3", categoryId: "agrot", name: "מונים (מים וחשמל)", amount: 2200 },
  { id: "b-a4", categoryId: "agrot", name: "חיבור תקשורת", amount: 5000 },
  { id: "b-a5", categoryId: "agrot", name: "אגרת כיבוי אש", amount: 130 },
  { id: "b-a6", categoryId: "agrot", name: "אגרת פינוי פסולת", amount: 3000 },
  { id: "b-a7", categoryId: "agrot", name: "אישור זכויות / נסח", amount: 173 },
  { id: "b-a8", categoryId: "agrot", name: "ועדה מקומית — מידע תכנוני", amount: 208 },
  { id: "b-a9", categoryId: "agrot", name: "ועדה מקומית — אגרת בניה", amount: 5459.25 },
  { id: "b-a10", categoryId: "agrot", name: "ועדה מקומית — אישור לטאבו", amount: 197 },
  { id: "b-a11", categoryId: "agrot", name: "רשות העתיקות", amount: 190, note: "ללא ימי פיקוח" },
  { id: "b-a12", categoryId: "agrot", name: "חתימה טרמית", amount: 650 },
  { id: "b-a13", categoryId: "agrot", name: "דו״ח ייעוץ ביסוס קרקע", amount: 2500, note: "כל יום חפירה — 1,600 ₪ נוסף" },
  { id: "b-a14", categoryId: "agrot", name: "מדידות (לפחות 4 בתהליך)", amount: 4500, note: "תקף לשנה" },
  { id: "b-a15", categoryId: "agrot", name: "היטל ביוב / אגרת מט״ש", amount: 22093.5, note: "לפי צו רשות המים, מתעדכן כל שנה · חישוב לפי מ״ר" },
  { id: "b-a16", categoryId: "agrot", name: "מכון בדיקות מעבדות בטון", amount: 2800 },
  { id: "b-a17", categoryId: "agrot", name: "היטל השבחה", amount: 4250, note: "לבתים מעל 140 מ״ר · 750–1,100 ₪ למ״ר נוסף" },
  { id: "b-a18", categoryId: "agrot", name: "מכון העתקות לתכניות וגרמושקא", amount: 2800 },
  { id: "b-a19", categoryId: "agrot", name: "עורך דין ונוטריון — מסמכים למשכנתא", amount: 1000 },
  { id: "b-a20", categoryId: "agrot", name: "פתיחת תיק משכנתא", amount: 360, note: "עמלה על כל תיק + 250 ₪ על כל 100 אש״ח" },
  { id: "b-a21", categoryId: "agrot", name: "רשם משכונות", amount: 450 },
  { id: "b-a22", categoryId: "agrot", name: "שמאות לבית מטעם הבנק", amount: 2360 },

  // בעלי מקצוע — 123,000
  { id: "b-p1", categoryId: "baaleyMiktzoa", name: "שירותים כלכליים", amount: 10000 },
  { id: "b-p2", categoryId: "baaleyMiktzoa", name: "אדריכל/ית (קבוצתי)", amount: 50000 },
  { id: "b-p3", categoryId: "baaleyMiktzoa", name: "מהנדס/ת (קבוצתי)", amount: 13000 },
  { id: "b-p4", categoryId: "baaleyMiktzoa", name: "פיקוח על קבלן (קבוצתי)", amount: 50000 },
  { id: "b-p5", categoryId: "baaleyMiktzoa", name: "עיצוב פנים", amount: 0, note: "בחוברת עדיין 0 (״דילמה״), אבל כבר שולמו 75,000 ₪ למעצבת — זה מה שמוציא את הקטגוריה מהתקציב" },
  { id: "b-p6", categoryId: "baaleyMiktzoa", name: "ייעוצים פרטניים (תאורה, בטיחות, נגישות, מס)", amount: 0, note: "דילמה — טרם הוחלט" },
  { id: "b-p7", categoryId: "baaleyMiktzoa", name: "עיצוב גינה", amount: 0, note: "דילמה — טרם הוחלט" },
  { id: "b-p8", categoryId: "baaleyMiktzoa", name: "ניהול בניה / פרויקטור", amount: 0, note: "דילמה — טרם הוחלט" },

  // אבזור והלבשות — 260,000
  { id: "b-h1", categoryId: "halbashot", name: "מיזוג", amount: 20000, note: "חובה · כדאי לקנות בחורף" },
  { id: "b-h2", categoryId: "halbashot", name: "מאווררי תקרה", amount: 6000, note: "חובה" },
  { id: "b-h3", categoryId: "halbashot", name: "מטבח + מכשירי חשמל", amount: 120000, note: "חובה" },
  { id: "b-h4", categoryId: "halbashot", name: "נגרות לבית (אחסון)", amount: 40000, note: "חובה" },
  { id: "b-h5", categoryId: "halbashot", name: "גופי תאורה פנים וחוץ", amount: 15000, note: "חובה" },
  { id: "b-h6", categoryId: "halbashot", name: "וילונות וקרניזים", amount: 15000, note: "חובה" },
  { id: "b-h7", categoryId: "halbashot", name: "אקססוריז לבית", amount: 15000, note: "חובה" },
  { id: "b-h8", categoryId: "halbashot", name: "ארוניות כיור + מראה", amount: 4000, note: "חובה" },
  { id: "b-h9", categoryId: "halbashot", name: "מקלחונים", amount: 9000, note: "שני מקלחונים · אמבטיה תוסיף כ-11,000 ₪" },
  { id: "b-h10", categoryId: "halbashot", name: "תוספת אדמה", amount: 5000, note: "חובה" },
  { id: "b-h11", categoryId: "halbashot", name: "שבילים", amount: 10000, note: "לשאול" },
  { id: "b-h12", categoryId: "halbashot", name: "מזוזות", amount: 1000, note: "חובה" },
  { id: "b-h13", categoryId: "halbashot", name: "ריהוט ומיטות", amount: 0, note: "חובה — טרם תומחר" },
  { id: "b-h14", categoryId: "halbashot", name: "מערכת ישיבה לגינה", amount: 0, note: "חובה — טרם תומחר" },
  { id: "b-h15", categoryId: "halbashot", name: "גג סולארי", amount: 0, note: "ייתכן שיהיה חובה ויעלה כ-75,000 ₪" },

  // בניה — מחושב: (בית + 40% מהמרפסת) × מחיר למ״ר
  { id: "b-n1", categoryId: "bniya", name: "בניה ערומה", amount: 1667340, derivedFrom: "build", note: "מחושב לפי גודל הבית והמרפסת — נשלט ממסך התקציב" },

  // רזרבה — מחושב: 15% מהיתרה להוצאה
  { id: "b-r1", categoryId: "rezerva", name: "רזרבת סיכון", amount: 0, derivedFrom: "reserve", note: "15% מהיתרה להוצאה · לא נכנס לחישוב סה״כ עלות הפרויקט" },
];

export const EXPENSES: Expense[] = [
  { id: "e1", date: "2025-09-08", amount: 20000, categoryId: "kabala", name: "דמי רצינות", payee: "קיבוץ ניר דוד", note: "לפני ההרשמה לבניה" },
  { id: "e2", date: "2025-09-30", amount: 2018, categoryId: "kabala", name: "אבחון כלכלי — להגיע בטוח לבית", payee: "דקלה ועומרי" },
  { id: "e3", date: "2025-10-23", amount: 2000, categoryId: "kabala", name: "אבחון חברתי — משאב גלילי", payee: "קבוצת בהתאמה" },
  { id: "e4", date: "2026-02-27", amount: 50000, categoryId: "kabala", name: "תשלום לקיבוץ", payee: "קרן נאמנות", note: "חלק מהעברה לנאמנות בסך 130,600 ₪" },
  { id: "e5", date: "2026-02-27", amount: 80600, categoryId: "baaleyMiktzoa", name: "פיתוח שטח — בעלי מקצוע", payee: "קרן נאמנות", note: "חלק מהעברה לנאמנות בסך 130,600 ₪" },
  { id: "e6", date: "2026-08-25", amount: 300000, categoryId: "tashtiot", name: "פיתוח שטח — תשתיות", payee: "החברה הכלכלית עמק המעיינות" },
  { id: "e7", date: "2026-09-16", amount: 3647, categoryId: "migrash", name: "שובר לפתיחת תיק לחכירת מגרש", payee: "רמ״י" },
  { id: "e8", date: "2026-09-18", amount: 75000, categoryId: "baaleyMiktzoa", name: "מעצבת פנים", payee: "מעצבת פנים" },
];

export const PLANNED: PlannedExpense[] = [
  { id: "p1", categoryId: "migrash", name: "קניית שטח — יתרת דמי היוון", amount: 211113, payee: "רמ״י", note: "בקובץ שלכם רשום ״?״ — הושלם מתוך עלות המגרש בחוברת (214,760 ₪) בניכוי השובר ששולם" },
  { id: "p2", categoryId: "baaleyMiktzoa", name: "ייעוץ עם מעצבות פנים", amount: 900, payee: "ענבר ותמר" },
];

export const CAPITAL: CapitalSource[] = [
  { id: "c1", name: "עו״ש של אייל במזרחי", owner: "eyal", amount: 19945, usable: 1, kind: "cash", altAmount: 15000, note: "בקובץ הקצר מופיע ״מזומן אייל 15,000 ₪״" },
  { id: "c2", name: "עו״ש של עדי בבנק יהב", owner: "adi", amount: 13377, usable: 1, kind: "cash" },
  { id: "c3", name: "קרן כספית של אייל במזרחי", owner: "eyal", amount: 32175, usable: 1, kind: "fund", altAmount: 20000 },
  { id: "c4", name: "קרן כספית של עדי בבנק יהב", owner: "adi", amount: 30000, usable: 1, kind: "fund", altAmount: 10000 },
  { id: "c5", name: "קופת גמל של אייל בהראל", owner: "eyal", amount: 205000, usable: 1, kind: "fund" },
  { id: "c13", name: "רווח מתנות חתונה", owner: "joint", amount: 250000, usable: 1, kind: "gift" },
  { id: "c6", name: "קופת גמל של עדי במיטב", owner: "adi", amount: 32930, usable: 1, kind: "fund", altAmount: 63000 },
  { id: "c7", name: "קרן השתלמות של עדי במיטב דש", owner: "adi", amount: 2517, usable: 0, kind: "pension", note: "תאריך נזילות 01/08/2030" },
  { id: "c8", name: "קרן השתלמות של אייל בכלל", owner: "eyal", amount: 6990, usable: 0, kind: "pension", altAmount: 7000, note: "תאריך נזילות לא ברור — אם עבר מועד הפדיון אפשר להתחשב ב-100%" },
  { id: "c9", name: "מתנה ממשפחה", owner: "joint", amount: 450000, usable: 1, kind: "gift", altAmount: 300000, note: "בקובץ הקצר: הורי אייל 300,000 ₪, הורי עדי 0 ₪. מומלץ תצהיר חתום שמבהיר ציפיות" },
  { id: "c10", name: "הלוואה ממשפחה", owner: "joint", amount: 0, usable: 1, kind: "loan", note: "המלצת היועצים: אם אפשר, עדיף הלוואה מההורים ופחות משכנתא" },
  { id: "c11", name: "הלוואות בחשבון (מינוס)", owner: "joint", amount: 0, usable: 1, kind: "loan", note: "לפי דוח יתרות הלוואות — לרשום במינוס" },
  { id: "c12", name: "צפי לכניסת כסף עתידי", owner: "eyal", amount: 400000, usable: 0, kind: "future", note: "בונוסים ותוכניות השתתפות במניות SolarEdge ל-4 שנים קרובות · בנוסף ייתכן סיוע עתידי מהמשפחה" },
];

export const TRACKS: MortgageTrack[] = [
  { id: "prime", name: "פריים (P-0.5)", shortName: "פריים", share: 0.33, annualRate: 5.5, linked: false, years: 25, slot: 0 },
  { id: "fixed", name: "קבועה לא צמודה (קל״צ)", shortName: "קל״צ", share: 0.34, annualRate: 5.2, linked: false, years: 25, slot: 1 },
  { id: "fixedLinked", name: "קבועה צמודה למדד", shortName: "ק״צ", share: 0.18, annualRate: 3.6, linked: true, years: 25, slot: 2 },
  { id: "varLinked", name: "משתנה כל 5 צמודה", shortName: "משתנה 5", share: 0.15, annualRate: 3.2, linked: true, years: 25, slot: 3 },
];

export const SETTINGS: Settings = {
  projectName: "ניר דוד — מגרש לבניה מרוכזת",
  monthlySavings: 6000,
  monthsToSave: 36,
  monthlyIncome: 37768.67,
  monthlyExpenses: 26424,
  currentRent: 5000,
  desiredRepayment: 9500,
  cpiAssumption: 2.5,
  primeRate: 6.0,
  houseSqm: 145,
  balconySqm: 30,
  balconyWeight: 0.4,
  buildCostPerSqm: 10620,
  netNeedSqm: 126,
  reserveRate: 0.15,
  pensionGap: 150000,
  bankDtiCap: 0.4,
};

export const INCOME_LINES = [
  { name: "משכורת נטו של אייל (SolarEdge)", amount: 17800 },
  { name: "משכורת של עדי (הדסה)", amount: 1000 },
  { name: "מלגת נכות של עדי", amount: 5000 },
  { name: "מלגות דוקטורט של עדי", amount: 10253 },
  { name: "הכנסות אחרות ומילואים", amount: 3715.67 },
];

export const EXPENSE_LINES = [
  { name: "דיור — שכירות הסוללים 7 ירושלים", amount: 5000 },
  { name: "הוצאות בחשבון של עדי", amount: 11643.33 },
  { name: "הוצאות בחשבון של אייל", amount: 11780.67 },
  { name: "זליגה", amount: -2000 },
];

export const INITIAL_STATE: AppState = {
  settings: SETTINGS,
  budgetLines: BUDGET_LINES,
  expenses: EXPENSES,
  planned: PLANNED,
  capital: CAPITAL,
  tracks: TRACKS,
};

/** Totals as stated in the consultants' booklet — used to flag drift after edits. */
export const BOOKLET = {
  totalCost: 2739979.35,
  spent: 533265,
  remaining: 2206714.35,
  liquidCapital: 1249427,
  potentialCapital: 1448934,
  possibleMortgage: 1496062.99,
  requiredRepayment: 6078.77,
  maxRepayment: 16344.67,
  surplus: 538775.64,
  reserve: 329474.9025,
  categoryTotals: {
    kabala: 84233,
    migrash: 214760,
    tashtiot: 300000,
    agrot: 90646.35,
    baaleyMiktzoa: 123000,
    halbashot: 260000,
    bniya: 1667340,
    rezerva: 329474.9025,
  } as Record<string, number>,
};
