import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "../lib/store";
import { computeTotals } from "../lib/selectors";
import {
  amortisation,
  annuityPayment,
  checkMixRules,
  computeMix,
  dti,
  effectiveRate,
} from "../lib/mortgage";
import { money, percent } from "../lib/format";
import { Badge, Card, Icon, NumberField, seriesVar } from "../components/ui";
import { ChartTooltip, Legend, TableFallback, axisStyle, gridProps, moneyTick } from "../components/charts";

export default function Mortgage() {
  const { state, update } = useStore();
  const totals = useMemo(() => computeTotals(state), [state]);
  const s = state.settings;
  const [principal, setPrincipal] = useState(() => Math.round(totals.requiredMortgage));

  const mix = useMemo(
    () => computeMix(principal, state.tracks, s.cpiAssumption),
    [principal, state.tracks, s.cpiAssumption]
  );
  const violations = useMemo(() => checkMixRules(state.tracks), [state.tracks]);
  const schedule = useMemo(() => amortisation(mix), [mix]);

  const shareSum = state.tracks.reduce((sum, t) => sum + t.share, 0);
  const bankCeiling = s.monthlyIncome * s.bankDtiCap;
  const dtiShare = dti(mix.payment, s.monthlyIncome);

  // Stress test: prime is the only track that moves with the Bank of Israel rate.
  const stressed = computeMix(
    principal,
    state.tracks.map((t) => (t.id === "prime" ? { ...t, annualRate: t.annualRate + 2 } : t)),
    s.cpiAssumption + 1
  );

  const setTrack = (id: string, p: Partial<(typeof state.tracks)[number]>) =>
    update({ tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...p } : t)) });

  const setSetting = (p: Partial<typeof s>) => update({ settings: { ...s, ...p } });

  const trackChartData = mix.tracks.map((t) => ({
    name: t.track.shortName,
    payment: t.payment,
    principal: t.principal,
    interest: t.interest,
    rate: t.rate,
    slot: t.track.slot,
    full: t.track.name,
  }));

  return (
    <div className="stack">
      <div className="page-head">
        <h1>משכנתא</h1>
        <p>
          בונים תמהיל, רואים מיד את ההחזר החודשי, את סך הריבית ואת החשיפה לעליית ריבית. הריביות הן
          הנחות עבודה — עדכנו אותן לפי ההצעות שתקבלו מהבנקים.
        </p>
      </div>

      <div className="grid grid-4">
        <div className="tile">
          <span className="tile-label">החזר חודשי</span>
          <span className="tile-value">{money(mix.payment)}</span>
          <span className="tile-note">{percent(dtiShare, 1)} מההכנסה נטו</span>
        </div>
        <div className="tile">
          <span className="tile-label">סך שיוחזר לבנק</span>
          <span className="tile-value">{money(mix.total)}</span>
          <span className="tile-note">מתוכם ריבית {money(mix.interest)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">ריבית משוקללת</span>
          <span className="tile-value">{mix.blendedRate.toFixed(2)}%</span>
          <span className="tile-note">כולל הנחת מדד {s.cpiAssumption}%</span>
        </div>
        <div className="tile">
          <span className="tile-label">עלות הכסף</span>
          <span className="tile-value">{percent(mix.interest / (principal || 1), 0)}</span>
          <span className="tile-note">ריבית ביחס לקרן</span>
        </div>
      </div>

      {dtiShare > s.bankDtiCap && (
        <Card>
          <div className="row" style={{ gap: 10 }}>
            <Badge tone="critical">
              <Icon name="alert" size={13} /> חריגה
            </Badge>
            <span>
              ההחזר {money(mix.payment)} הוא {percent(dtiShare, 1)} מההכנסה — מעל תקרת הבנק של{" "}
              {percent(s.bankDtiCap, 0)} ({money(bankCeiling)}). צריך להקטין את הקרן או להאריך את
              התקופה.
            </span>
          </div>
        </Card>
      )}

      {violations.length > 0 && (
        <Card>
          <div className="stack" style={{ gap: 8 }}>
            {violations.map((v) => (
              <div className="row" style={{ gap: 10 }} key={v.rule}>
                <Badge tone="warning">
                  <Icon name="alert" size={13} /> מגבלת בנק ישראל
                </Badge>
                <span>
                  {v.rule} — כרגע {percent(v.actual, 0)}.
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card large title="סכום המשכנתא">
        <div className="grid grid-2" style={{ alignItems: "end" }}>
          <div className="field">
            <label>כמה ניקח מהבנק</label>
            <input
              className="slider"
              type="range"
              min={0}
              max={Math.max(2500000, Math.round(totals.requiredMortgage * 1.4))}
              step={10000}
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
            />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="hint">0</span>
              <strong style={{ fontSize: 22 }}>{money(principal)}</strong>
              <span className="hint">
                {money(Math.max(2500000, Math.round(totals.requiredMortgage * 1.4)))}
              </span>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn-sm"
              onClick={() => setPrincipal(Math.round(totals.requiredMortgage))}
            >
              נדרש: {money(totals.requiredMortgage)}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setPrincipal(Math.round(totals.possibleMortgage))}
            >
              אפשרי: {money(totals.possibleMortgage)}
            </button>
          </div>
        </div>
      </Card>

      <Card
        large
        title="התמהיל"
        sub={`סך המשקלות ${Math.round(shareSum * 100)}% — הם מנורמלים ל-100% בחישוב`}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>מסלול</th>
                <th className="num">חלק</th>
                <th className="num">ריבית</th>
                <th className="num">שנים</th>
                <th className="num">קרן</th>
                <th className="num">החזר חודשי</th>
                <th className="num">ריבית מצטברת</th>
              </tr>
            </thead>
            <tbody>
              {state.tracks.map((t) => {
                const r = mix.tracks.find((x) => x.track.id === t.id);
                return (
                  <tr key={t.id}>
                    <td>
                      <span className="row" style={{ gap: 7, flexWrap: "nowrap" }}>
                        <span className="swatch" style={{ background: seriesVar(t.slot) }} />
                        <span>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                          {t.linked && <span className="hint">צמוד מדד</span>}
                        </span>
                      </span>
                    </td>
                    <td className="num">
                      <input
                        className="input input-num"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(t.share * 100)}
                        onChange={(e) => setTrack(t.id, { share: Number(e.target.value) / 100 })}
                        style={{ width: 78 }}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="input input-num"
                        type="number"
                        step={0.1}
                        value={t.annualRate}
                        onChange={(e) => setTrack(t.id, { annualRate: Number(e.target.value) })}
                        style={{ width: 80 }}
                      />
                      {t.linked && (
                        <div className="hint">
                          אפקטיבי {effectiveRate(t, s.cpiAssumption).toFixed(2)}%
                        </div>
                      )}
                    </td>
                    <td className="num">
                      <input
                        className="input input-num"
                        type="number"
                        min={4}
                        max={30}
                        value={t.years}
                        onChange={(e) => setTrack(t.id, { years: Number(e.target.value) })}
                        style={{ width: 70 }}
                      />
                    </td>
                    <td className="num">{money(r?.principal ?? 0)}</td>
                    <td className="num" style={{ fontWeight: 650 }}>
                      {money(r?.payment ?? 0)}
                    </td>
                    <td className="num">{money(r?.interest ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>סה״כ</td>
                <td className="num">{Math.round(shareSum * 100)}%</td>
                <td className="num">{mix.blendedRate.toFixed(2)}%</td>
                <td className="num">{mix.longestYears}</td>
                <td className="num">{money(mix.principal)}</td>
                <td className="num">{money(mix.payment)}</td>
                <td className="num">{money(mix.interest)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-3" style={{ marginTop: 20 }}>
          <NumberField
            label="הנחת מדד שנתי"
            suffix="%"
            value={s.cpiAssumption}
            step={0.1}
            onChange={(cpiAssumption) => setSetting({ cpiAssumption })}
            hint="נוסף לריבית של המסלולים הצמודים"
          />
          <NumberField
            label="ריבית פריים"
            suffix="%"
            value={s.primeRate}
            step={0.25}
            onChange={(primeRate) => setSetting({ primeRate })}
            hint="ריבית בנק ישראל + 1.5%"
          />
          <NumberField
            label="תקרת החזר של הבנק"
            suffix="% מההכנסה"
            value={Math.round(s.bankDtiCap * 100)}
            step={5}
            onChange={(v) => setSetting({ bankDtiCap: v / 100 })}
            hint={`כיום ${money(bankCeiling)} בחודש`}
          />
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="ההחזר החודשי לפי מסלול" sub="מי אוכל את רוב ההחזר">
          <div className="chart" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trackChartData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="name"
                  tick={axisStyle}
                  axisLine={{ stroke: "var(--line-strong)" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={moneyTick}
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  orientation="right"
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-sunken)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof trackChartData)[number];
                    return (
                      <ChartTooltip
                        title={d.full}
                        rows={[
                          { label: "החזר חודשי", value: money(d.payment), color: seriesVar(d.slot) },
                          { label: "קרן", value: money(d.principal) },
                          { label: "ריבית מצטברת", value: money(d.interest) },
                          { label: "ריבית אפקטיבית", value: `${d.rate.toFixed(2)}%` },
                        ]}
                      />
                    );
                  }}
                />
                <Bar dataKey="payment" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {trackChartData.map((d) => (
                    <Cell key={d.name} fill={seriesVar(d.slot)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend
            items={trackChartData.map((d) => ({
              label: d.full,
              color: seriesVar(d.slot),
              note: money(d.payment),
            }))}
          />
        </Card>

        <Card title="מבחן לחץ" sub="מה קורה אם הפריים יעלה ב-2% והמדד ב-1%">
          <div className="stack" style={{ gap: 12 }}>
            <div className="scenario-metric">
              <span>החזר חודשי היום</span>
              <strong>{money(mix.payment)}</strong>
            </div>
            <div className="scenario-metric">
              <span>החזר בתרחיש לחץ</span>
              <strong style={{ color: "var(--critical-ink)" }}>{money(stressed.payment)}</strong>
            </div>
            <div className="scenario-metric">
              <span>תוספת חודשית</span>
              <strong>{money(stressed.payment - mix.payment)}</strong>
            </div>
            <div className="scenario-metric">
              <span>תוספת לאורך כל התקופה</span>
              <strong>{money(stressed.total - mix.total)}</strong>
            </div>
            <div className="scenario-metric">
              <span>נטל מההכנסה בתרחיש</span>
              <strong
                style={{
                  color:
                    dti(stressed.payment, s.monthlyIncome) > s.bankDtiCap
                      ? "var(--critical-ink)"
                      : "var(--good-ink)",
                }}
              >
                {percent(dti(stressed.payment, s.monthlyIncome), 1)}
              </strong>
            </div>
          </div>
          <div
            className="note-box"
            style={{
              marginTop: 16,
              background:
                stressed.payment <= totals.maxRepayment
                  ? "color-mix(in srgb, var(--good) 12%, transparent)"
                  : "color-mix(in srgb, var(--warning) 18%, transparent)",
            }}
          >
            {stressed.payment <= totals.maxRepayment ? (
              <>
                גם בתרחיש הלחץ ההחזר ({money(stressed.payment)}) נשאר בתוך יכולת ההחזר שלכם (
                {money(totals.maxRepayment)}). זה תמהיל שאתם יכולים לעמוד בו.
              </>
            ) : (
              <>
                בתרחיש הלחץ ההחזר ({money(stressed.payment)}) חורג מיכולת ההחזר שלכם (
                {money(totals.maxRepayment)}). שווה להקטין את חלק הפריים או את המסלולים הצמודים.
              </>
            )}
          </div>
        </Card>
      </div>

      <Card large title="לוח הסילוקין" sub="יתרת החוב, ולצידה מה מתוך ההחזר השנתי הולך לריבית ומה לקרן">
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>יתרת החוב לאורך השנים</h3>
        <div className="chart" style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={schedule} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="year"
                tick={axisStyle}
                axisLine={{ stroke: "var(--line-strong)" }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}`}
                reversed
              />
              <YAxis
                tickFormatter={moneyTick}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={58}
                orientation="right"
              />
              <Tooltip
                cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof schedule)[number];
                  return (
                    <ChartTooltip
                      title={`שנה ${label}`}
                      rows={[{ label: "יתרת חוב", value: money(d.balance), color: "var(--s1)" }]}
                      footer={`נותרו ${mix.longestYears - d.year} שנות תשלום`}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="var(--s1)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="divider" />

        <h3 style={{ fontSize: 14, marginBottom: 8 }}>מה משלמים בכל שנה</h3>
        <div className="chart" style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={schedule} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="year"
                tick={axisStyle}
                axisLine={{ stroke: "var(--line-strong)" }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}`}
                reversed
              />
              <YAxis
                tickFormatter={moneyTick}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={58}
                orientation="right"
              />
              <Tooltip
                cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof schedule)[number];
                  return (
                    <ChartTooltip
                      title={`שנה ${label}`}
                      rows={[
                        { label: "ריבית בשנה", value: money(d.interest), color: "var(--s2)" },
                        { label: "קרן בשנה", value: money(d.principalPaid), color: "var(--s3)" },
                      ]}
                      footer={`סה״כ שולם בשנה ${money(d.payment)}`}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="interest"
                stroke="var(--s2)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="principalPaid"
                stroke="var(--s3)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Legend
          items={[
            { label: "ריבית בשנה", color: "var(--s2)" },
            { label: "קרן בשנה", color: "var(--s3)" },
          ]}
        />
        <p className="hint" style={{ marginTop: 10 }}>
          בשנים הראשונות רוב ההחזר הולך לריבית, ורק בהמשך הוא מתחיל לנגוס בקרן. זו הסיבה שפירעון
          מוקדם משתלם הרבה יותר בתחילת הדרך.
        </p>
        <TableFallback
          caption="לוח סילוקין שנתי"
          head={["שנה", "החזר", "ריבית", "קרן", "יתרה"]}
          rows={schedule.map((r) => [
            `${r.year}`,
            money(r.payment),
            money(r.interest),
            money(r.principalPaid),
            money(r.balance),
          ])}
        />
      </Card>

      <Card title="השוואה מהירה לתקופות שונות" sub={`על קרן של ${money(principal)} בריבית משוקללת ${mix.blendedRate.toFixed(2)}%`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>תקופה</th>
                <th className="num">החזר חודשי</th>
                <th className="num">סך שיוחזר</th>
                <th className="num">ריבית</th>
                <th className="num">נטל מההכנסה</th>
              </tr>
            </thead>
            <tbody>
              {[15, 20, 25, 30].map((years) => {
                const pay = annuityPayment(principal, mix.blendedRate, years);
                const total = pay * years * 12;
                const share = dti(pay, s.monthlyIncome);
                return (
                  <tr key={years}>
                    <td>{years} שנה</td>
                    <td className="num" style={{ fontWeight: 650 }}>
                      {money(pay)}
                    </td>
                    <td className="num">{money(total)}</td>
                    <td className="num">{money(total - principal)}</td>
                    <td
                      className="num"
                      style={{
                        color: share > s.bankDtiCap ? "var(--critical-ink)" : "var(--good-ink)",
                        fontWeight: 650,
                      }}
                    >
                      {percent(share, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          תקופה ארוכה יותר מורידה את ההחזר החודשי אבל מייקרת משמעותית את סך הריבית. זה בדיוק
          ה-trade-off שמוצג בדף היעדים.
        </p>
      </Card>
    </div>
  );
}
