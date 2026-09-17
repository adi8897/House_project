import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { CATEGORIES } from "../data/seed";
import type { CategoryId, PlannedExpense } from "../data/types";
import { rollupCategories } from "../lib/selectors";
import { money, shortDate, todayISO, uid } from "../lib/format";
import { Card, Field, Icon, Money, seriesVar } from "../components/ui";

export default function Planned() {
  const { state, update } = useStore();
  const [draft, setDraft] = useState<Partial<PlannedExpense>>({ categoryId: "bniya" });

  const rows = useMemo(() => rollupCategories(state), [state]);
  const plannedTotal = state.planned
    .filter((p) => !p.unknown)
    .reduce((s, p) => s + p.amount, 0);
  const unplanned = rows
    .filter((r) => !r.isReserve)
    .reduce((s, r) => s + r.unplanned, 0);

  const add = () => {
    if (!draft.name || !draft.categoryId) return;
    const item: PlannedExpense = {
      id: uid(),
      categoryId: draft.categoryId,
      name: draft.name,
      amount: Number(draft.amount ?? 0),
      payee: draft.payee,
      expectedDate: draft.expectedDate,
      unknown: !draft.amount,
      note: draft.note,
    };
    update({ planned: [...state.planned, item] });
    setDraft({ categoryId: draft.categoryId });
  };

  const remove = (id: string) => update({ planned: state.planned.filter((p) => p.id !== id) });

  const patch = (id: string, p: Partial<PlannedExpense>) =>
    update({ planned: state.planned.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  const promote = (item: PlannedExpense) => {
    if (item.unknown) return;
    update({
      planned: state.planned.filter((p) => p.id !== item.id),
      expenses: [
        ...state.expenses,
        {
          id: uid(),
          date: todayISO(),
          amount: item.amount,
          categoryId: item.categoryId,
          name: item.name,
          payee: item.payee,
          note: item.note,
        },
      ],
    });
  };

  return (
    <div className="stack">
      <div className="page-head">
        <h1>הוצאות צפויות</h1>
        <p>
          תשלומים שאתם יודעים שיגיעו אבל טרם שולמו. כשמשלמים — לוחצים על ״שולם״ והשורה עוברת
          להוצאות בפועל.
        </p>
      </div>

      <div className="grid grid-3">
        <div className="tile">
          <span className="tile-label">סך הצפוי הרשום</span>
          <span className="tile-value">{money(plannedTotal)}</span>
          <span className="tile-note">{state.planned.length} שורות</span>
        </div>
        <div className="tile">
          <span className="tile-label">יתרת תקציב שטרם תוכננה</span>
          <span className="tile-value">{money(unplanned)}</span>
          <span className="tile-note">קיים בתקציב, אין לו עדיין שורת צפי</span>
        </div>
        <div className="tile">
          <span className="tile-label">סה״כ להוצאה</span>
          <span className="tile-value">{money(plannedTotal + unplanned)}</span>
          <span className="tile-note">צפוי רשום + יתרה לא מתוכננת</span>
        </div>
      </div>

      <Card title="הוספת הוצאה צפויה">
        <div className="grid grid-3">
          <Field label="מה צפוי">
            <input
              className="input"
              placeholder="לדוגמה: אגרת בניה"
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="סכום" hint="להשאיר ריק אם עוד לא ידוע">
            <input
              className="input input-num"
              type="number"
              placeholder="?"
              value={draft.amount ?? ""}
              onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="מתי צפוי">
            <input
              className="input"
              type="date"
              value={draft.expectedDate ?? ""}
              onChange={(e) => setDraft({ ...draft, expectedDate: e.target.value })}
            />
          </Field>
          <Field label="למי">
            <input
              className="input"
              value={draft.payee ?? ""}
              onChange={(e) => setDraft({ ...draft, payee: e.target.value })}
            />
          </Field>
          <Field label="קטגוריה">
            <select
              className="select"
              value={draft.categoryId ?? "bniya"}
              onChange={(e) => setDraft({ ...draft, categoryId: e.target.value as CategoryId })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="פירוט">
            <input
              className="input"
              value={draft.note ?? ""}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </Field>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={add} disabled={!draft.name}>
            <span className="row" style={{ gap: 6 }}>
              <Icon name="plus" size={16} /> הוספה
            </span>
          </button>
        </div>
      </Card>

      <Card title="הצפי שלכם">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>מה</th>
                <th>למי</th>
                <th>קטגוריה</th>
                <th>מתי</th>
                <th className="num">סכום</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.planned.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.note && <div className="hint">{p.note}</div>}
                  </td>
                  <td>{p.payee ?? "—"}</td>
                  <td>
                    <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                      <span
                        className="swatch"
                        style={{
                          background: seriesVar(
                            CATEGORIES.find((c) => c.id === p.categoryId)?.slot ?? 0
                          ),
                        }}
                      />
                      {CATEGORIES.find((c) => c.id === p.categoryId)?.name}
                    </span>
                  </td>
                  <td className="num">{p.expectedDate ? shortDate(p.expectedDate) : "—"}</td>
                  <td className="num">
                    {p.unknown ? (
                      <input
                        className="input input-num"
                        type="number"
                        placeholder="?"
                        style={{ width: 110 }}
                        onChange={(e) =>
                          patch(p.id, { amount: Number(e.target.value), unknown: false })
                        }
                      />
                    ) : (
                      <Money value={p.amount} />
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 2, flexWrap: "nowrap" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => promote(p)}
                        disabled={p.unknown}
                        title="להעביר להוצאות בפועל"
                      >
                        שולם
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => remove(p.id)}
                        aria-label={`מחיקת ${p.name}`}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>סה״כ צפוי</td>
                <td className="num">{money(plannedTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card title="יתרה שטרם תוכננה, לפי קטגוריה" sub="כסף שקיים בתקציב אבל אין לו עדיין שורת צפי">
        {rows
          .filter((r) => !r.isReserve && r.unplanned > 0)
          .map((r) => (
            <div className="cat-row" key={r.id}>
              <span className="cat-name">
                <span className="swatch" style={{ background: seriesVar(r.slot) }} />
                {r.name}
              </span>
              <span className="cat-figures">{money(r.unplanned)}</span>
            </div>
          ))}
      </Card>
    </div>
  );
}
