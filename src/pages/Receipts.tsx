import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { CATEGORIES } from "../data/seed";
import type { ReceiptMeta } from "../data/types";
import {
  addReceipt,
  deleteReceipt,
  getReceiptBlob,
  listReceipts,
  requestPersistence,
  storageEstimate,
  updateReceipt,
} from "../lib/receipts";
import { money, shortDate } from "../lib/format";
import { Badge, Card, Icon, seriesVar } from "../components/ui";

const kb = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

export default function Receipts() {
  const { state } = useStore();
  const [items, setItems] = useState<ReceiptMeta[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [over, setOver] = useState(false);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const list = await listReceipts();
    setItems(list);
    setUsage(await storageEstimate());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Object URLs are revoked on unmount so the blobs are not retained.
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const it of items) {
        if (!it.type.startsWith("image/")) continue;
        const blob = await getReceiptBlob(it.id);
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        created.push(url);
        next[it.id] = url;
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [items]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) await addReceipt(file);
    await refresh();
  };

  const open = async (item: ReceiptMeta) => {
    const blob = await getReceiptBlob(item.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const download = async (item: ReceiptMeta) => {
    const blob = await getReceiptBlob(item.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string) => {
    await deleteReceipt(id);
    await refresh();
  };

  const link = async (id: string, patch: Partial<ReceiptMeta>) => {
    await updateReceipt(id, patch);
    await refresh();
  };

  const persist = async () => setPersisted(await requestPersistence());

  return (
    <div className="stack">
      <div className="page-head">
        <h1>קבלות</h1>
        <p>
          הקבצים נשמרים בדפדפן הזה בלבד, על המחשב שלכם. שום קובץ לא עולה לאינטרנט ולא נשמר בשום
          שרת — מה שאומר שגם צריך לגבות אותם מדי פעם.
        </p>
      </div>

      <div
        className="dropzone"
        data-over={over}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void upload(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={26} />
        <p style={{ margin: "10px 0 4px", fontWeight: 650, color: "var(--ink)" }}>
          גררו לכאן קבלות, או לחצו לבחירה
        </p>
        <p className="hint">תמונות, PDF, כל פורמט</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 14 }}
          onClick={() => inputRef.current?.click()}
        >
          בחירת קבצים
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => void upload(e.target.files)}
        />
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="hint">
          {items.length} קבלות
          {usage && ` · ${kb(usage.usage)} בשימוש מתוך ${kb(usage.quota)} שהדפדפן הקצה`}
        </span>
        <div className="row" style={{ gap: 8 }}>
          {persisted === null ? (
            <button className="btn btn-sm" onClick={() => void persist()}>
              לבקש אחסון קבוע
            </button>
          ) : (
            <Badge tone={persisted ? "good" : "warning"}>
              {persisted ? "✓ אחסון קבוע אושר" : "הדפדפן לא אישר אחסון קבוע"}
            </Badge>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="empty">עוד לא העליתם קבלות</div>
        </Card>
      ) : (
        <div className="receipt-grid">
          {items.map((item) => {
            const cat = CATEGORIES.find((c) => c.id === item.categoryId);
            return (
              <div className="receipt" key={item.id}>
                <button
                  className="receipt-thumb"
                  onClick={() => void open(item)}
                  style={{ border: 0, padding: 0, cursor: "pointer" }}
                  aria-label={`פתיחת ${item.name}`}
                >
                  {thumbs[item.id] ? (
                    <img src={thumbs[item.id]} alt="" />
                  ) : (
                    <span style={{ color: "var(--ink-muted)" }}>
                      <Icon name="file" size={30} />
                    </span>
                  )}
                </button>
                <div className="receipt-meta">
                  <span className="receipt-name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="hint">
                    {kb(item.size)} · {shortDate(item.addedAt.slice(0, 10))}
                  </span>
                  <select
                    className="select"
                    style={{ padding: "5px 8px", fontSize: 12.5, marginTop: 4 }}
                    value={item.expenseId ?? ""}
                    onChange={(e) =>
                      void link(item.id, {
                        expenseId: e.target.value || undefined,
                        categoryId: state.expenses.find((x) => x.id === e.target.value)
                          ?.categoryId,
                      })
                    }
                  >
                    <option value="">לשייך להוצאה…</option>
                    {state.expenses.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} · {money(e.amount)}
                      </option>
                    ))}
                  </select>
                  {cat && (
                    <span className="row" style={{ gap: 6, marginTop: 4 }}>
                      <span className="swatch" style={{ background: seriesVar(cat.slot) }} />
                      <span className="hint">{cat.name}</span>
                    </span>
                  )}
                </div>
                <div className="receipt-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => void download(item)}>
                    <Icon name="download" size={15} />
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => void remove(item.id)}
                    aria-label={`מחיקת ${item.name}`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="note-box">
        <strong>חשוב לדעת:</strong> אחסון בדפדפן נמחק אם תנקו את נתוני האתר, תשתמשו בחלון פרטי, או
        תעברו למחשב אחר. לחצו על ״לבקש אחסון קבוע״ כדי שהדפדפן לא ימחק אותם אוטומטית, ושמרו עותק של
        הקבלות החשובות גם במקום אחר.
      </div>
    </div>
  );
}
