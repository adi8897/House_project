import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "../lib/store";
import { computeTotals, rollupCategories, spendTimeline } from "../lib/selectors";
import { money, percent, shortDate, compact } from "../lib/format";
import { Badge, Card, Money, Progress, Tile, seriesVar } from "../components/ui";
import { ChartTooltip, Legend, TableFallback, axisStyle, gridProps, moneyTick } from "../components/charts";

export default function Overview() {
  const { state } = useStore();
  const totals = useMemo(() => computeTotals(state), [state]);
  const rows = useMemo(() => rollupCategories(state), [state]);
  const timeline = useMemo(() => spendTimeline(state), [state]);

  const project = rows.filter((r) => !r.isReserve);
  const reserve = rows.find((r) => r.isReserve);

  const remainingByCategory = [...project]
    .filter((r) => r.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const compositionRow = project.reduce<Record<string, string | number>>(
    (acc, r) => ({ ...acc, [r.name]: r.budget }),
    { name: "תקציב" }
  );

  const burnup = timeline.actual.map((p) => ({
    date: p.date,
    cumulative: p.cumulative,
    label: p.label,
    amount: p.amount,
  }));

  return (
    <div className="stack">
      <div className="hero">
        <span className="hero-label">נשאר להוציא על הבית</span>
        <div className="hero-figure">{money(totals.remaining)}</div>
        <p className="hero-note">
          מתוך תקציב כולל של {money(totals.totalCost)}. עד היום שילמתם {money(totals.spent)}, שהם{" "}
          {percent(totals.progress, 1)} מהתקציב.
        </p>
        <dl className="hero-stats">
          <div className="hero-stat">
            <dt>הון עצמי נזיל</dt>
            <dd>{money(totals.liquidCapital)}</dd>
          </div>
          <div className="hero-stat">
            <dt>משכנתא נדרשת</dt>
            <dd>{money(totals.requiredMortgage)}</dd>
          </div>
          <div className="hero-stat">
            <dt>משכנתא אפשרית</dt>
            <dd>{money(totals.possibleMortgage)}</dd>
          </div>
          <div className="hero-stat">
            <dt>{totals.surplus >= 0 ? "עודף" : "פער"}</dt>
            <dd>{money(Math.abs(totals.surplus))}</dd>
          </div>
        </dl>
      </div>

      {reserve && totals.reserveGap > 0 && (
        <Card>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                <Badge tone="serious">⚠ לשים לב</Badge>
                <strong>הרזרבה לא מכוסה במלואה</strong>
              </div>
              <p className="advice-body">
                הרזרבה הנדרשת היא {money(reserve.budget)}, והעודף שנשאר לכם אחרי כל העלויות הוא{" "}
                {money(totals.surplus)}. חסרים <Money value={totals.reserveGap} tone="critical" /> כדי
                להיכנס לבניה עם כרית ביטחון מלאה.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-4">
        <Tile label="סה״כ עלות הפרויקט" value={money(totals.totalCost)} note="ללא רזרבה" />
        <Tile label="הוצאנו עד היום" value={money(totals.spent)} note={`${percent(totals.progress, 1)} מהתקציב`} />
        <Tile
          label="יכולת החזר מקסימלית"
          value={money(totals.maxRepayment)}
          note={`חיסכון פוטנציאלי ${money(totals.potentialMonthlySaving)} ועוד שכר דירה שנחסך ${money(state.settings.currentRent)}`}
        />
        <Tile
          label="רזרבה"
          value={money(totals.reserve)}
          note={totals.reserveGap > 0 ? `חסרים ${money(totals.reserveGap)}` : "מכוסה במלואה"}
          tone={totals.reserveGap > 0 ? "critical" : "good"}
        />
      </div>

      <Card
        large
        title="כמה נשאר להוציא בכל קטגוריה"
        sub="היתרה שטרם שולמה, לפי הצפי בחוברת התקציב. מרחפים על עמודה לפירוט."
      >
        <div className="chart" style={{ height: Math.max(220, remainingByCategory.length * 46) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={remainingByCategory}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 16 }}
              barCategoryGap="22%"
            >
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis
                type="number"
                tickFormatter={moneyTick}
                tick={axisStyle}
                axisLine={{ stroke: "var(--line-strong)" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={96}
                orientation="right"
              />
              <Tooltip
                cursor={{ fill: "var(--surface-sunken)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof remainingByCategory)[number];
                  return (
                    <ChartTooltip
                      title={d.name}
                      rows={[
                        { label: "תקציב", value: money(d.budget), color: seriesVar(d.slot) },
                        { label: "שולם", value: money(d.spent) },
                        { label: "נשאר", value: money(d.remaining) },
                        { label: "מתוכנן כבר", value: money(d.planned) },
                      ]}
                      footer={d.description}
                    />
                  );
                }}
              />
              <Bar dataKey="remaining" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {remainingByCategory.map((r) => (
                  <Cell key={r.id} fill={seriesVar(r.slot)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <TableFallback
          caption="יתרה להוצאה לפי קטגוריה"
          head={["קטגוריה", "תקציב", "שולם", "נשאר"]}
          rows={remainingByCategory.map((r) => [r.name, money(r.budget), money(r.spent), money(r.remaining)])}
        />
      </Card>

      <div className="grid grid-2">
        <Card title="התקדמות לפי קטגוריה" sub="כמה מהתקציב של כל קטגוריה כבר שולם">
          {project.map((r) => (
            <div className="cat-row" key={r.id}>
              <span className="cat-name">
                <span className="swatch" style={{ background: seriesVar(r.slot) }} />
                {r.name}
              </span>
              <span className="cat-figures">
                שולם {money(r.spent)} מתוך {money(r.budget)}
              </span>
              <div className="cat-bar">
                <Progress
                  value={r.progress}
                  color={seriesVar(r.slot)}
                  track={r.planned > 0 && r.budget > 0 ? { value: r.planned / r.budget } : undefined}
                />
              </div>
            </div>
          ))}
          <Legend
            items={[
              { label: "שולם", color: "var(--s1)", note: "צבע מלא" },
              {
                label: "מתוכנן אך טרם שולם",
                color: "color-mix(in srgb, var(--s1) 30%, var(--surface-sunken))",
                note: "צבע בהיר",
              },
            ]}
          />
        </Card>

        <Card title="עוגת התקציב" sub="מרכיבי הפרויקט כחלק מהעלות הכוללת">
          <div className="chart" style={{ height: 86 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[compositionRow]}
                layout="vertical"
                margin={{ top: 8, right: 0, bottom: 8, left: 0 }}
              >
                <XAxis type="number" hide domain={[0, totals.totalCost]} />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    const cat = project.find((c) => c.name === p.name);
                    if (!cat) return null;
                    return (
                      <ChartTooltip
                        title={cat.name}
                        rows={[
                          { label: "תקציב", value: money(cat.budget), color: seriesVar(cat.slot) },
                          { label: "מהפרויקט", value: percent(cat.budget / totals.totalCost, 1) },
                        ]}
                        footer={cat.description}
                      />
                    );
                  }}
                />
                {project.map((r, i) => (
                  <Bar
                    key={r.id}
                    dataKey={r.name}
                    stackId="a"
                    fill={seriesVar(r.slot)}
                    isAnimationActive={false}
                    radius={i === 0 ? [8, 0, 0, 8] : i === project.length - 1 ? [0, 8, 8, 0] : 0}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend
            items={project.map((r) => ({
              label: r.name,
              color: seriesVar(r.slot),
              note: percent(r.budget / totals.totalCost, 0),
            }))}
          />
          <TableFallback
            caption="הרכב התקציב"
            head={["קטגוריה", "תקציב", "אחוז"]}
            rows={project.map((r) => [
              r.name,
              money(r.budget),
              percent(r.budget / totals.totalCost, 1),
            ])}
          />
        </Card>
      </div>

      <Card large title="קצב ההוצאה" sub="הוצאה מצטברת מתחילת התהליך מול התקציב הכולל">
        <div className="chart" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={burnup} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
              <defs>
                <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--s1)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--s1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => shortDate(v).slice(3)}
                tick={axisStyle}
                axisLine={{ stroke: "var(--line-strong)" }}
                tickLine={false}
                reversed
              />
              <YAxis
                tickFormatter={moneyTick}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={58}
                orientation="right"
                domain={[0, Math.max(totals.spent * 1.15, 100000)]}
              />
              <Tooltip
                cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof burnup)[number];
                  return (
                    <ChartTooltip
                      title={shortDate(d.date)}
                      rows={[
                        { label: d.label, value: money(d.amount) },
                        { label: "מצטבר", value: money(d.cumulative), color: "var(--s1)" },
                      ]}
                      footer={`${percent(d.cumulative / totals.totalCost, 1)} מהתקציב הכולל`}
                    />
                  );
                }}
              />
              <Area
                type="stepAfter"
                dataKey="cumulative"
                stroke="var(--s1)"
                strokeWidth={2}
                fill="url(#burnFill)"
                dot={{ r: 4, fill: "var(--s1)", stroke: "var(--surface)", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "var(--s1)", stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          סה״כ {burnup.length} תשלומים · הגדול ביותר{" "}
          {money(Math.max(...burnup.map((b) => b.amount), 0))} · נותרו{" "}
          {money(totals.remaining)} מתוך {compact(totals.totalCost)} ₪
        </p>
        <TableFallback
          caption="הוצאה מצטברת"
          head={["תאריך", "הוצאה", "סכום", "מצטבר"]}
          rows={burnup.map((b) => [shortDate(b.date), b.label, money(b.amount), money(b.cumulative)])}
        />
      </Card>
    </div>
  );
}
