const ils = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

const ilsPrecise = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

const num = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

export const money = (n: number) => ils.format(Math.round(n));
export const moneyPrecise = (n: number) => ilsPrecise.format(n);
export const number = (n: number) => num.format(n);
export const percent = (n: number, digits = 0) =>
  `${(n * 100).toFixed(digits)}%`;

/** Compact form for axis ticks: 1.67M / 214K. */
export const compact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 2)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`;
  return num.format(n);
};

export const shortDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const monthLabel = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("he-IL", { month: "short", year: "2-digit" });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
