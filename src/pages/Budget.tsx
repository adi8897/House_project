import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { BOOKLET, CATEGORIES } from "../data/seed";
import type { CategoryId } from "../data/types";
import { rollupCategories, computeTotals } from "../lib/selectors";
import { money, percent, uid } from "../lib/format";
import { Badge, Card, Icon, Progress, seriesVar } from "../components/ui";

export default function Budget() {
  const { state, update } = useStore();
  const [open, setOpen] = useState<CategoryId | null>("bniya");

  const rows = useMemo(() => rollupCategories(state), [state]);
  const totals = useMemo(() => computeTotals(state), [state]);

  const drift = totals.totalCost - BOOKLET.totalCost;

  const patchLine = (id: string, amount: number) =>
    update({
      budgetLines: state.budgetLines.map((l) => (l.id === id ? { ...l, amount } : l)),
    });

  const addLine = (categoryId: CategoryId) =>
    update({
      budgetLines: [
        ...state.budgetLines,
        { id: uid(), categoryId, name: "שורה חדשה", amount: 0 },
      ],
    });

  const renameLine = (id: string, name: string) =>
    update({ budgetLines: state.budgetLines.map((l) => (l.id === id ? { ...l, name } : l)) });

  const removeLine = (id: string) =>
    update({ budgetLines: state.budgetLines.filter((l) => l.id !== id) });

  return (
    <div className="stack">
      <div className="page-head">
        <h1>התקציב</h1>
        <p>
          8 הקטגוריות מחוברת התקציב, עם כל שורות המשנה. אפשר לערוך כל סכום — הכל מתעדכן מיד בגרפים
          ובחישוב המשכנתא.
        </p>
      </div>

      <div className="grid grid-3">
        <div className="tile">
          <span className="tile-label">סה״כ רף המעבר</span>
          <span className="tile-value">{money(totals.totalCost)}</span>
          <span className="tile-note">
            {Math.abs(drift) < 1
              ? "תואם לחוברת התקציב"
              : `${drift > 0 ? "גבוה" : "נמוך"} ב-${money(Math.abs(drift))} מהחוברת`}
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">מחיר למ״ר בית</span>
          <span className="tile-value">
            {money(totals.totalCost / state.settings.buildSizeSqm)}
          </span>
          <span className="tile-note">
            עלות מלאה חלקי {state.settings.buildSizeSqm} מ״ר
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">רזרבה</span>
          <span className="tile-value">{money(totals.reserve)}</span>
          <span className="tile-note">לא נכללת בסה״כ העלות</span>
        </div>
      </div>

      {rows.map((r) => {
        const lines = state.budgetLines.filter((l) => l.categoryId === r.id);
        const expanded = open === r.id;
        return (
          <Card key={r.id}>
            <button
              onClick={() => setOpen(expanded ? null : r.id)}
              aria-expanded={expanded}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "block",
                width: "100%",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                <span className="cat-name" style={{ fontSize: 16 }}>
                  <span className="swatch" style={{ background: seriesVar(r.slot) }} />
                  {r.name}
                  {r.isReserve && <Badge>מחוץ לסה״כ</Badge>}
                </span>
                <span className="cat-figures">
                  {money(r.spent)} מתוך {money(r.budget)} · נשאר{" "}
                  <strong style={{ color: "var(--ink)" }}>{money(r.remaining)}</strong>
                </span>
              </div>
              <p className="hint" style={{ margin: "4px 0 10px" }}>
                {r.description}
              </p>
              <Progress value={r.progress} color={seriesVar(r.slot)} />
            </button>

            {expanded && (
              <>
                <div className="divider" />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>מרכיב</th>
                        <th className="num">עלות משוערת</th>
                        <th>הערה</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <input
                              className="input"
                              value={l.name}
                              onChange={(e) => renameLine(l.id, e.target.value)}
                              style={{ border: "none", padding: "2px 0", background: "none" }}
                            />
                          </td>
                          <td className="num">
                            <input
                              className="input input-num"
                              type="number"
                              value={l.amount}
                              onChange={(e) => patchLine(l.id, Number(e.target.value))}
                              style={{ width: 130 }}
                            />
                          </td>
                          <td className="hint" style={{ maxWidth: 360 }}>
                            {l.note ?? ""}
                          </td>
                          <td>
                            <button
                              className="btn btn-danger"
                              onClick={() => removeLine(l.id)}
                              aria-label={`מחיקת ${l.name}`}
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>סה״כ {r.name}</td>
                        <td className="num">{money(r.budget)}</td>
                        <td colSpan={2} className="hint">
                          {Math.abs(r.budget - (BOOKLET.categoryTotals[r.id] ?? 0)) < 1
                            ? "תואם לחוברת"
                            : `בחוברת: ${money(BOOKLET.categoryTotals[r.id] ?? 0)}`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => addLine(r.id)}
                >
                  <span className="row" style={{ gap: 5 }}>
                    <Icon name="plus" size={14} /> שורה חדשה
                  </span>
                </button>
              </>
            )}
          </Card>
        );
      })}

      <Card title="חלוקת התקציב" sub="כל קטגוריה כאחוז מסך עלות הפרויקט">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>קטגוריה</th>
                <th className="num">תקציב</th>
                <th className="num">מהפרויקט</th>
                <th className="num">שולם</th>
                <th className="num">נשאר</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => !r.isReserve)
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="row" style={{ gap: 7, flexWrap: "nowrap" }}>
                        <span className="swatch" style={{ background: seriesVar(r.slot) }} />
                        {r.name}
                      </span>
                    </td>
                    <td className="num">{money(r.budget)}</td>
                    <td className="num">{percent(r.budget / totals.totalCost, 1)}</td>
                    <td className="num">{money(r.spent)}</td>
                    <td className="num">{money(r.remaining)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <td>סה״כ</td>
                <td className="num">{money(totals.totalCost)}</td>
                <td className="num">100%</td>
                <td className="num">{money(totals.spent)}</td>
                <td className="num">{money(totals.remaining)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="note-box">
        קטגוריית <strong>{CATEGORIES.find((c) => c.id === "tashtiot")?.name}</strong>: החוברת מפרטת
        310,000 ₪ פיתוח ציבורי ועוד 15,000 ₪ השוואת תשתיות, אבל מסכמת את הקטגוריה ב-300,000 ₪.
        הוספתי שורת התאמה של ‎-25,000 ₪ כדי שהסה״כ יישאר תואם — שווה לברר מול היועצים מה הנכון.
      </div>
    </div>
  );
}
