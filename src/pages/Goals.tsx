import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { computeTotals } from "../lib/selectors";
import {
  buildRecommendations,
  buildScenarios,
  conflictsWith,
  principalAfterGoals,
} from "../lib/advice";
import { computeMix, optimiseMix } from "../lib/mortgage";
import { money, percent } from "../lib/format";
import { Badge, Card, Icon, Progress, seriesVar } from "../components/ui";
import { Legend } from "../components/charts";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "קריטי",
  serious: "חשוב",
  warning: "שווה לבדוק",
  good: "מצב טוב",
};

const SEVERITY_ICON: Record<string, string> = {
  critical: "alert",
  serious: "alert",
  warning: "info",
  good: "check",
};

const IMPACT_LABEL: Record<string, string> = {
  principal: "מקטין את הקרן",
  payment: "מקטין את ההחזר",
  risk: "מקטין סיכון",
};

export default function Goals() {
  const { state } = useStore();
  const totals = useMemo(() => computeTotals(state), [state]);
  const recs = useMemo(() => buildRecommendations(state), [state]);
  const [chosen, setChosen] = useState<Record<string, boolean>>({});

  const baseMix = useMemo(
    () => computeMix(totals.requiredMortgage, state.tracks, state.settings.cpiAssumption),
    [totals.requiredMortgage, state.tracks, state.settings.cpiAssumption]
  );

  const lowestPayment = useMemo(
    () =>
      optimiseMix(
        totals.requiredMortgage,
        state.tracks,
        state.settings.cpiAssumption,
        "payment"
      ),
    [totals.requiredMortgage, state.tracks, state.settings.cpiAssumption]
  );

  // The cheapest total is always the shortest term, so it is only useful if the
  // resulting payment still clears the bank's debt-to-income ceiling.
  const lowestTotal = useMemo(
    () =>
      optimiseMix(
        totals.requiredMortgage,
        state.tracks,
        state.settings.cpiAssumption,
        "total",
        state.settings.monthlyIncome * state.settings.bankDtiCap
      ),
    [
      totals.requiredMortgage,
      state.tracks,
      state.settings.cpiAssumption,
      state.settings.monthlyIncome,
      state.settings.bankDtiCap,
    ]
  );

  const scenarios = useMemo(
    () =>
      buildScenarios(
        state,
        lowestPayment
          ? {
              payment: lowestPayment.result.payment,
              total: lowestPayment.result.total,
              blendedRate: lowestPayment.result.blendedRate,
              principal: lowestPayment.result.principal,
              years: lowestPayment.result.longestYears,
            }
          : null,
        lowestTotal
          ? {
              payment: lowestTotal.result.payment,
              total: lowestTotal.result.total,
              blendedRate: lowestTotal.result.blendedRate,
              principal: lowestTotal.result.principal,
              years: lowestTotal.result.longestYears,
            }
          : null
      ),
    [state, lowestPayment, lowestTotal]
  );

  const actionable = recs.filter((r) => (r.principalSaving ?? 0) > 0 && r.id !== "reserve");
  const chosenSaving = actionable
    .filter((r) => chosen[r.id])
    .reduce((sum, r) => sum + (r.principalSaving ?? 0), 0);

  const after = principalAfterGoals(state, chosenSaving);
  const bestPaymentId = scenarios.reduce(
    (best, s) => (s.payment < best.payment ? s : best),
    scenarios[0]
  )?.id;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>יעדים והמלצות</h1>
        <p>
          מה אפשר לעשות כדי להגיע למשכנתא הנמוכה ביותר — בהחזר החודשי, בסכום הקרן ובעלות הכוללת.
          כל ההמלצות מחושבות מהנתונים שלכם, לא מכללי אצבע.
        </p>
      </div>

      <Card large title="שלושת התרחישים זה מול זה" sub="אותה משפחה, אותו פרויקט — שלוש הגדרות שונות של ״הנמוך ביותר״">
        <div className="grid grid-3">
          {scenarios.map((sc) => (
            <div className="scenario" key={sc.id} data-best={sc.id === bestPaymentId}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ fontSize: 16 }}>{sc.label}</h3>
                {sc.id === bestPaymentId && <Badge tone="good">הכי נמוך חודשית</Badge>}
              </div>
              <p className="hint" style={{ marginBottom: 12 }}>
                {sc.description}
              </p>
              <div className="scenario-metric">
                <span>החזר חודשי</span>
                <strong>{money(sc.payment)}</strong>
              </div>
              <div className="scenario-metric">
                <span>סכום המשכנתא</span>
                <strong>{money(sc.principal)}</strong>
              </div>
              <div className="scenario-metric">
                <span>תקופה</span>
                <strong>{sc.years} שנה</strong>
              </div>
              <div className="scenario-metric">
                <span>סך שיוחזר</span>
                <strong>{money(sc.totalPaid)}</strong>
              </div>
              <div className="scenario-metric">
                <span>מזה ריבית</span>
                <strong>{money(sc.interest)}</strong>
              </div>
              <div className="scenario-metric">
                <span>נטל מההכנסה</span>
                <strong
                  style={{
                    color:
                      sc.dtiShare > state.settings.bankDtiCap
                        ? "var(--critical-ink)"
                        : "var(--good-ink)",
                  }}
                >
                  {percent(sc.dtiShare, 1)}
                </strong>
              </div>
              <div className="tradeoff">{sc.tradeoff}</div>
            </div>
          ))}
        </div>

        <div className="divider" />

        <div className="table-wrap">
          <table>
            <caption className="sr-only">השוואת תרחישים</caption>
            <thead>
              <tr>
                <th>תרחיש</th>
                <th className="num">החזר חודשי</th>
                <th className="num">קרן</th>
                <th className="num">תקופה</th>
                <th className="num">סך שיוחזר</th>
                <th className="num">ריבית</th>
                <th className="num">ריבית משוקללת</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>התמהיל הנוכחי שלכם</td>
                <td className="num">{money(baseMix.payment)}</td>
                <td className="num">{money(baseMix.principal)}</td>
                <td className="num">{baseMix.longestYears}</td>
                <td className="num">{money(baseMix.total)}</td>
                <td className="num">{money(baseMix.interest)}</td>
                <td className="num">{baseMix.blendedRate.toFixed(2)}%</td>
              </tr>
              {scenarios.map((sc) => (
                <tr key={sc.id}>
                  <td>{sc.label}</td>
                  <td className="num">{money(sc.payment)}</td>
                  <td className="num">{money(sc.principal)}</td>
                  <td className="num">{sc.years}</td>
                  <td className="num">{money(sc.totalPaid)}</td>
                  <td className="num">{money(sc.interest)}</td>
                  <td className="num">{sc.blendedRate.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {lowestPayment && lowestTotal && (
          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <div>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>
                תמהיל להחזר חודשי נמוך · {lowestPayment.result.longestYears} שנה
              </h3>
              {lowestPayment.tracks.map((t) => (
                <div className="cat-row" key={t.id} style={{ padding: "9px 0" }}>
                  <span className="cat-name" style={{ fontSize: 14 }}>
                    <span className="swatch" style={{ background: seriesVar(t.slot) }} />
                    {t.name}
                  </span>
                  <span className="cat-figures">{percent(t.share, 0)}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>
                תמהיל לעלות כוללת נמוכה · {lowestTotal.result.longestYears} שנה
              </h3>
              {lowestTotal.tracks.map((t) => (
                <div className="cat-row" key={t.id} style={{ padding: "9px 0" }}>
                  <span className="cat-name" style={{ fontSize: 14 }}>
                    <span className="swatch" style={{ background: seriesVar(t.slot) }} />
                    {t.name}
                  </span>
                  <span className="cat-figures">{percent(t.share, 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="hint" style={{ marginTop: 14 }}>
          שני התמהילים נבדקו מול מגבלות בנק ישראל: עד שני שלישים פריים, לפחות שליש בריבית קבועה,
          ועד שני שלישים במסלולים משתנים.
        </p>
      </Card>

      <Card large title="מחשבון יעדים" sub="סמנו יעדים ותראו איך המשכנתא מתכווצת">
        <div className="stack" style={{ gap: 10 }}>
          {actionable.map((r) => (
            <label
              key={r.id}
              className="row"
              style={{
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                background: chosen[r.id] ? "var(--brand-soft)" : "var(--surface-2)",
                cursor: "pointer",
                gap: 12,
              }}
            >
              <span className="row" style={{ gap: 10 }}>
                <input
                  type="checkbox"
                  checked={Boolean(chosen[r.id])}
                  onChange={(e) => {
                    const next = { ...chosen, [r.id]: e.target.checked };
                    // Selecting one lever clears the ones it already subsumes.
                    if (e.target.checked) conflictsWith(r.id).forEach((id) => (next[id] = false));
                    setChosen(next);
                  }}
                  style={{ width: 17, height: 17, accentColor: "var(--brand)" }}
                />
                <span>
                  <strong>{r.action ?? r.title}</strong>
                  <div className="hint">{r.title}</div>
                </span>
              </span>
              <span className="num" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                −{money(r.principalSaving ?? 0)}
              </span>
            </label>
          ))}
        </div>

        <div className="divider" />

        <div className="grid grid-4">
          <div className="tile">
            <span className="tile-label">חיסכון מצטבר מהיעדים</span>
            <span className="tile-value" style={{ color: "var(--good-ink)" }}>
              {money(chosenSaving)}
            </span>
          </div>
          <div className="tile">
            <span className="tile-label">משכנתא נדרשת</span>
            <span className="tile-value">{money(after.principal)}</span>
            <span className="tile-note">במקום {money(totals.requiredMortgage)}</span>
          </div>
          <div className="tile">
            <span className="tile-label">החזר חודשי</span>
            <span className="tile-value">{money(after.payment)}</span>
            <span className="tile-note">במקום {money(baseMix.payment)}</span>
          </div>
          <div className="tile">
            <span className="tile-label">חיסכון חודשי</span>
            <span className="tile-value" style={{ color: "var(--good-ink)" }}>
              {money(Math.max(0, baseMix.payment - after.payment))}
            </span>
            <span className="tile-note">פחות לבנק כל חודש</span>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 7 }}>
            <span className="hint">היעד: משכנתא בהחזר הרצוי שלכם</span>
            <span className="hint">
              {money(after.principal)} מתוך {money(after.maxPrincipal)} אפשריים
            </span>
          </div>
          <Progress
            value={after.maxPrincipal > 0 ? Math.min(1, after.principal / after.maxPrincipal) : 0}
            color={
              after.principal <= after.maxPrincipal ? "var(--good)" : "var(--critical)"
            }
          />
          <Legend
            items={[
              {
                label:
                  after.principal <= after.maxPrincipal
                    ? "המשכנתא נכנסת בהחזר הרצוי"
                    : "המשכנתא עדיין גדולה מההחזר הרצוי",
                color: after.principal <= after.maxPrincipal ? "var(--good)" : "var(--critical)",
              },
            ]}
          />
        </div>
      </Card>

      <div>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>ההמלצות שלנו</h2>
        <p className="hint" style={{ marginBottom: 16 }}>
          {recs.length} תובנות, מסודרות לפי דחיפות
        </p>
        <div className="advice">
          {recs.map((r) => (
            <article className="advice-card" key={r.id} data-severity={r.severity}>
              <div className="advice-head">
                <h3>{r.title}</h3>
                <Badge tone={r.severity}>
                  <Icon name={SEVERITY_ICON[r.severity]} size={13} />
                  {SEVERITY_LABEL[r.severity]}
                </Badge>
              </div>
              <p className="advice-body">{r.body}</p>
              {(r.principalSaving || r.paymentSaving || r.action) && (
                <div className="advice-impact">
                  {r.impact.map((i) => (
                    <span className="impact-chip" key={i}>
                      {IMPACT_LABEL[i]}
                    </span>
                  ))}
                  {r.principalSaving ? (
                    <span className="impact-chip">
                      קרן: <strong>−{money(r.principalSaving)}</strong>
                    </span>
                  ) : null}
                  {r.paymentSaving ? (
                    <span className="impact-chip">
                      החזר: <strong>−{money(r.paymentSaving)} לחודש</strong>
                    </span>
                  ) : null}
                  {r.action && (
                    <span className="impact-chip">
                      פעולה: <strong>{r.action}</strong>
                    </span>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
