import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { CATEGORIES } from "../data/seed";
import type { CategoryId, Expense } from "../data/types";
import { money, shortDate, todayISO, uid } from "../lib/format";
import { Badge, Card, Field, Icon, seriesVar } from "../components/ui";

const catById = (id: CategoryId) => CATEGORIES.find((c) => c.id === id);

export default function Expenses() {
  const { state, update } = useStore();
  const [filter, setFilter] = useState<CategoryId | "all">("all");
  const [draft, setDraft] = useState<Partial<Expense>>({
    date: todayISO(),
    categoryId: "kabala",
  });

  const list = useMemo(() => {
    const filtered =
      filter === "all" ? state.expenses : state.expenses.filter((e) => e.categoryId === filter);
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [state.expenses, filter]);

  const total = list.reduce((s, e) => s + e.amount, 0);

  const add = () => {
    if (!draft.name || !draft.amount || !draft.categoryId) return;
    const expense: Expense = {
      id: uid(),
      date: draft.date || todayISO(),
      amount: Number(draft.amount),
      categoryId: draft.categoryId,
      name: draft.name,
      payee: draft.payee,
      note: draft.note,
    };
    update({ expenses: [...state.expenses, expense] });
    setDraft({ date: todayISO(), categoryId: draft.categoryId });
  };

  const remove = (id: string) =>
    update({ expenses: state.expenses.filter((e) => e.id !== id) });

  const patch = (id: string, p: Partial<Expense>) =>
    update({ expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...p } : e)) });

  return (
    <div className="stack">
      <div className="page-head">
        <h1>הוצאות בפועל</h1>
        <p>
          כל תשלום שכבר יצא מהחשבון. הסכומים מתגלגלים אוטומטית לקטגוריות בתקציב ולגרפים בדף
          הסקירה.
        </p>
      </div>

      <Card title="הוספת הוצאה">
        <div className="grid grid-3">
          <Field label="תאריך">
            <input
              className="input"
              type="date"
              value={draft.date ?? ""}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          <Field label="מה שילמנו">
            <input
              className="input"
              placeholder="לדוגמה: מקדמה לאדריכל"
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="סכום">
            <input
              className="input input-num"
              type="number"
              placeholder="0"
              value={draft.amount ?? ""}
              onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="למי">
            <input
              className="input"
              placeholder="שם הספק"
              value={draft.payee ?? ""}
              onChange={(e) => setDraft({ ...draft, payee: e.target.value })}
            />
          </Field>
          <Field label="קטגוריה">
            <select
              className="select"
              value={draft.categoryId ?? "kabala"}
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
              placeholder="לא חובה"
              value={draft.note ?? ""}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </Field>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={add} disabled={!draft.name || !draft.amount}>
            <span className="row" style={{ gap: 6 }}>
              <Icon name="plus" size={16} /> הוספה
            </span>
          </button>
        </div>
      </Card>

      <Card
        title={`${list.length} הוצאות · ${money(total)}`}
        aside={
          <select
            className="select"
            style={{ width: "auto" }}
            value={filter}
            onChange={(e) => setFilter(e.target.value as CategoryId | "all")}
          >
            <option value="all">כל הקטגוריות</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>הוצאה</th>
                <th>למי</th>
                <th>קטגוריה</th>
                <th className="num">סכום</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const cat = catById(e.categoryId);
                return (
                  <tr key={e.id}>
                    <td className="num">{shortDate(e.date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.name}</div>
                      {e.note && <div className="hint">{e.note}</div>}
                    </td>
                    <td>{e.payee ?? "—"}</td>
                    <td>
                      <select
                        className="select"
                        style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
                        value={e.categoryId}
                        onChange={(ev) =>
                          patch(e.id, { categoryId: ev.target.value as CategoryId })
                        }
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {cat && (
                        <span
                          className="swatch"
                          style={{
                            background: seriesVar(cat.slot),
                            display: "inline-block",
                            marginInlineStart: 6,
                            verticalAlign: "middle",
                          }}
                        />
                      )}
                    </td>
                    <td className="num" style={{ fontWeight: 650 }}>
                      {money(e.amount)}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => remove(e.id)}
                        aria-label={`מחיקת ${e.name}`}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>סה״כ</td>
                <td className="num">{money(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {list.length === 0 && <div className="empty">אין הוצאות בקטגוריה הזו עדיין</div>}
      </Card>

      <div className="note-box">
        <Badge tone="good">✓</Badge> הנתונים נשמרים בדפדפן שלכם בלבד. אפשר לגבות אותם לקובץ בכל רגע
        דרך כפתור הגיבוי בראש העמוד.
      </div>
    </div>
  );
}
