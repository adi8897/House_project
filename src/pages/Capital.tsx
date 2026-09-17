import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../lib/store";
import { EXPENSE_LINES, INCOME_LINES } from "../data/seed";
import { computeTotals } from "../lib/selectors";
import { money, percent, uid } from "../lib/format";
import { Badge, Card, Icon, NumberField, seriesVar } from "../components/ui";
import { ChartTooltip, Legend, TableFallback, axisStyle, gridProps, moneyTick } from "../components/charts";

const KIND_LABEL: Record<string, string> = {
  cash: "עו״ש",
  fund: "קרן / גמל",
  pension: "השתלמות",
  gift: "מתנה",
  loan: "הלוואה",
  future: "כסף עתידי",
};

export default function Capital() {
  const { state, update } = useStore();
  const totals = useMemo(() => computeTotals(state), [state]);
  const s = state.settings;

  const patch = (id: string, p: Partial<(typeof state.capital)[number]>) =>
    update({ capital: state.capital.map((c) => (c.id === id ? { ...c, ...p } : c)) });

  const remove = (id: string) => update({ capital: state.capital.filter((c) => c.id !== id) });

  const add = () =>
    update({
      capital: [
        ...state.capital,
        { id: uid(), name: "מקור חדש", owner: "joint", amount: 0, usable: 1, kind: "cash" },
      ],
    });

  const setSetting = (p: Partial<typeof s>) => update({ settings: { ...s, ...p } });

  const fundingData = [
    {
      name: "מול העלות",
      שולם: totals.spent,
      "הון נזיל": totals.liquidCapital,
      משכנתא: totals.possibleMortgage,
    },
  ];

  const reconcile = state.capital.filter((c) => c.altAmount !== undefined);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>הון וחסכונות</h1>
        <p>
          כל מקורות ההון שלכם, כמה מכל אחד באמת זמין לפרויקט היום, ואיך התזרים החודשי מתורגם ליכולת
          החזר.
        </p>
      </div>

      <div className="grid grid-4">
        <div className="tile">
          <span className="tile-label">זמין היום</span>
          <span className="tile-value">{money(totals.capitalNow)}</span>
          <span className="tile-note">יתרות שאפשר למשוך עכשיו</span>
        </div>
        <div className="tile">
          <span className="tile-label">חיסכון עד תחילת הבניה</span>
          <span className="tile-value">{money(totals.savedOverHorizon)}</span>
          <span className="tile-note">
            {money(s.monthlySavings)} לחודש × {s.monthsToSave} חודשים
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">הון נזיל לתהליך</span>
          <span className="tile-value">{money(totals.liquidCapital)}</span>
          <span className="tile-note">זמין היום ועוד החיסכון — זה המספר שבחוברת</span>
        </div>
        <div className="tile">
          <span className="tile-label">לא נזיל / עתידי</span>
          <span className="tile-value">{money(totals.futureCapital)}</span>
          <span className="tile-note">קיים אך לא נספר בחישוב</span>
        </div>
      </div>

      <Card
        large
        title="מקורות ההון"
        sub="עמודת ״זמין״ קובעת כמה מהסכום נספר כהון נזיל לפרויקט"
        aside={
          <button className="btn btn-sm" onClick={add}>
            <span className="row" style={{ gap: 5 }}>
              <Icon name="plus" size={14} /> מקור
            </span>
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>מקור</th>
                <th>סוג</th>
                <th className="num">סכום</th>
                <th className="num">זמין</th>
                <th className="num">נספר כהון</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.capital.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      className="input"
                      value={c.name}
                      onChange={(e) => patch(c.id, { name: e.target.value })}
                      style={{ border: "none", padding: "2px 0", background: "none", minWidth: 200 }}
                    />
                    {c.note && <div className="hint">{c.note}</div>}
                  </td>
                  <td>
                    <Badge>{KIND_LABEL[c.kind]}</Badge>
                  </td>
                  <td className="num">
                    <input
                      className="input input-num"
                      type="number"
                      value={c.amount}
                      onChange={(e) => patch(c.id, { amount: Number(e.target.value) })}
                      style={{ width: 130 }}
                    />
                  </td>
                  <td className="num">
                    <select
                      className="select"
                      style={{ width: 90, padding: "6px 8px" }}
                      value={c.usable}
                      onChange={(e) => patch(c.id, { usable: Number(e.target.value) })}
                    >
                      <option value={1}>100%</option>
                      <option value={0.5}>50%</option>
                      <option value={0}>0%</option>
                    </select>
                  </td>
                  <td className="num" style={{ fontWeight: 650 }}>
                    {money(c.amount * c.usable)}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => remove(c.id)}
                      aria-label={`מחיקת ${c.name}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>זמין היום</td>
                <td className="num">{money(totals.capitalNow)}</td>
                <td />
              </tr>
              <tr>
                <td colSpan={4}>
                  ועוד חיסכון של {money(s.monthlySavings)} × {s.monthsToSave} חודשים
                </td>
                <td className="num">{money(totals.savedOverHorizon)}</td>
                <td />
              </tr>
              <tr>
                <td colSpan={4}>הון נזיל לתהליך</td>
                <td className="num">{money(totals.liquidCapital)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {reconcile.length > 0 && (
        <Card title="פערים בין שני הקבצים" sub="השווי מהחוברת מול הקובץ הקצר — כדאי להחליט מה מעודכן">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>מקור</th>
                  <th className="num">בחוברת התקציב</th>
                  <th className="num">בקובץ הקצר</th>
                  <th className="num">הפרש</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reconcile.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="num">{money(c.amount)}</td>
                    <td className="num">{money(c.altAmount ?? 0)}</td>
                    <td
                      className="num"
                      style={{
                        color:
                          (c.altAmount ?? 0) > c.amount ? "var(--good-ink)" : "var(--critical-ink)",
                        fontWeight: 650,
                      }}
                    >
                      {(c.altAmount ?? 0) - c.amount > 0 ? "+" : ""}
                      {money((c.altAmount ?? 0) - c.amount)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => patch(c.id, { amount: c.altAmount ?? c.amount })}
                      >
                        לקחת את הקצר
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            סך ההפרש:{" "}
            {money(reconcile.reduce((sum, c) => sum + ((c.altAmount ?? 0) - c.amount), 0))} · החיסכון
            החודשי רשום 6,000 ₪ בחוברת ו-5,000 ₪ בקובץ הקצר.
          </p>
        </Card>
      )}

      <div className="grid grid-2">
        <Card title="התזרים החודשי" sub="ההכנסות וההוצאות שמזינות את יכולת ההחזר">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>הכנסות</th>
                  <th className="num">נטו</th>
                </tr>
              </thead>
              <tbody>
                {INCOME_LINES.map((l) => (
                  <tr key={l.name}>
                    <td>{l.name}</td>
                    <td className="num">{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>סה״כ הכנסות</td>
                  <td className="num">{money(s.monthlyIncome)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="divider" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>הוצאות</th>
                  <th className="num">חודשי</th>
                </tr>
              </thead>
              <tbody>
                {EXPENSE_LINES.map((l) => (
                  <tr key={l.name}>
                    <td>{l.name}</td>
                    <td className="num">{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>סה״כ הוצאות</td>
                  <td className="num">{money(s.monthlyExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="note-box" style={{ marginTop: 16 }}>
            חיסכון פוטנציאלי <strong>{money(totals.potentialMonthlySaving)}</strong>, ועוד שכר
            הדירה <strong>{money(s.currentRent)}</strong> שייחסך ברגע שתעברו לבית — יכולת החזר
            מקסימלית <strong>{money(totals.maxRepayment)}</strong>.
          </div>
        </Card>

        <Card title="מה מממן את הפרויקט" sub={`עלות כוללת ${money(totals.totalCost)}`}>
          <div className="chart" style={{ height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={fundingData}
                layout="vertical"
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis
                  type="number"
                  tickFormatter={moneyTick}
                  tick={axisStyle}
                  axisLine={{ stroke: "var(--line-strong)" }}
                  tickLine={false}
                />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                  cursor={{ fill: "var(--surface-sunken)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <ChartTooltip
                        title="מקורות מימון"
                        rows={payload.map((p) => ({
                          label: String(p.name),
                          value: money(Number(p.value)),
                          color: String(p.color),
                        }))}
                        footer={`סה״כ ${money(totals.totalAvailable)} מול עלות ${money(totals.totalCost)}`}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="שולם"
                  stackId="f"
                  fill={seriesVar(0)}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  radius={[0, 0, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="הון נזיל"
                  stackId="f"
                  fill={seriesVar(2)}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="משכנתא"
                  stackId="f"
                  fill={seriesVar(3)}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend
            items={[
              { label: "שולם כבר", color: seriesVar(0), note: money(totals.spent) },
              { label: "הון נזיל", color: seriesVar(2), note: money(totals.liquidCapital) },
              { label: "משכנתא אפשרית", color: seriesVar(3), note: money(totals.possibleMortgage) },
            ]}
          />
          <div
            className="note-box"
            style={{
              marginTop: 16,
              background:
                totals.surplus >= 0
                  ? "color-mix(in srgb, var(--good) 12%, transparent)"
                  : "color-mix(in srgb, var(--critical) 12%, transparent)",
            }}
          >
            סך המקורות {money(totals.totalAvailable)} מול עלות {money(totals.totalCost)} —{" "}
            <strong>
              {totals.surplus >= 0 ? "עודף" : "פער"} של {money(Math.abs(totals.surplus))}
            </strong>
            {totals.reserveGap > 0 && (
              <>
                {" "}
                · הרזרבה הנדרשת {money(totals.reserve)}, כלומר חסרים{" "}
                <strong>{money(totals.reserveGap)}</strong>
              </>
            )}
          </div>
          <TableFallback
            caption="מקורות מימון"
            head={["מקור", "סכום", "מהעלות"]}
            rows={[
              ["שולם כבר", money(totals.spent), percent(totals.spent / totals.totalCost, 1)],
              [
                "הון נזיל",
                money(totals.liquidCapital),
                percent(totals.liquidCapital / totals.totalCost, 1),
              ],
              [
                "משכנתא אפשרית",
                money(totals.possibleMortgage),
                percent(totals.possibleMortgage / totals.totalCost, 1),
              ],
            ]}
          />
        </Card>
      </div>

      <Card title="הנחות החיסכון" sub="משפיע ישירות על ההון הפוטנציאלי ועל המלצות היעדים">
        <div className="grid grid-3">
          <NumberField
            label="חיסכון חודשי"
            value={s.monthlySavings}
            step={250}
            onChange={(monthlySavings) => setSetting({ monthlySavings })}
            hint="בחוברת 6,000 ₪ · בקובץ הקצר 5,000 ₪"
          />
          <NumberField
            label="חודשי חיסכון קדימה"
            value={s.monthsToSave}
            step={1}
            min={0}
            onChange={(monthsToSave) => setSetting({ monthsToSave })}
            hint="כמה חודשים עד תחילת הבניה"
          />
          <NumberField
            label="הכנסה חודשית נטו"
            value={Math.round(s.monthlyIncome)}
            step={100}
            onChange={(monthlyIncome) => setSetting({ monthlyIncome })}
          />
          <NumberField
            label="הוצאות חודשיות"
            value={Math.round(s.monthlyExpenses)}
            step={100}
            onChange={(monthlyExpenses) => setSetting({ monthlyExpenses })}
          />
          <NumberField
            label="שכר דירה היום"
            value={s.currentRent}
            step={100}
            onChange={(currentRent) => setSetting({ currentRent })}
            hint="נחסך כשעוברים לבית ומצטרף ליכולת ההחזר"
          />
          <NumberField
            label="השלמת פנסיה נדרשת"
            value={s.pensionGap}
            step={1000}
            onChange={(pensionGap) => setSetting({ pensionGap })}
            hint="מתוך הבדיקה הביטוחית והפנסיונית"
          />
        </div>
      </Card>
    </div>
  );
}
