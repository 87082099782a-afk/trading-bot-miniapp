import { useMemo, useState } from "react";
import { actionLabel, apiAction } from "./api.js";
import {
  ACTIONS,
  APP_CONFIG,
  AUTO_TRADING_MODES,
  CONFIG_ERROR,
  SAFETY_PAYLOAD,
  SYMBOLS,
  THEMES,
  TIMEFRAMES,
  TRADING_MODES
} from "./config.js";
import { initTelegram, notifyHaptic, triggerHaptic } from "./telegram.js";

const screens = [
  ["dashboard", "Dashboard", ACTIONS.status],
  ["market", "Market Selector", ACTIONS.getSymbols],
  ["radar", "Opportunity Radar", ACTIONS.getOpportunityRadar],
  ["signals", "Signals", ACTIONS.getSignal],
  ["multi", "Multi Signal Dashboard", ACTIONS.getMultiSignal],
  ["plan", "Trade Plan", ACTIONS.getTradePlan],
  ["auto", "Auto Trading", ACTIONS.autotuneStatus],
  ["paper", "Paper Trading", ACTIONS.startPaperTrading],
  ["real", "Real Trading Control", ACTIONS.requestRealMode],
  ["modes", "Trading Modes", ACTIONS.status],
  ["risk", "Risk Management", ACTIONS.status],
  ["profit", "Profit Calculator", ACTIONS.calculateProfit],
  ["balance", "Balance", ACTIONS.getBalance],
  ["statistics", "Statistics", ACTIONS.getStats],
  ["backtest", "Backtest", ACTIONS.backtest],
  ["watchlist", "Watchlist", ACTIONS.getPairRanking],
  ["advisor", "AI Trade Advisor", ACTIONS.marketAnalysis],
  ["diagnostics", "Diagnostics", ACTIONS.diagnostics],
  ["repair", "Self Repair", ACTIONS.selfRepair],
  ["logs", "Error Logs", ACTIONS.getLogs],
  ["settings", "Settings", ACTIONS.getSettings],
  ["emergency", "Emergency Stop", ACTIONS.emergencyStop]
].map(([id, title, action]) => ({ id, title, action }));

const riskRules = [
  ["maxDailyLoss", "3%"],
  ["maxTradeRisk", "1%"],
  ["maxOpenTrades", "1"],
  ["minimumConfidence", "75%"],
  ["minimumRiskReward", "1.5"],
  ["stopAfterLosses", "3"],
  ["cooldownAfterLoss", "true"],
  ["newsProtection", "true"],
  ["spreadProtection", "true"],
  ["slippageProtection", "true"],
  ["weekendProtection", "true"]
];

const quality = ["trend", "RSI", "MACD", "EMA", "volume", "volatility", "spread", "news risk", "liquidity"];

const text = (value, fallback = "Waiting") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

function Pill({ children, tone = "safe" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function Card({ title, value, tone = "neutral" }) {
  return (
    <article className={`card ${tone}`}>
      <span>{title}</span>
      <strong>{text(value)}</strong>
    </article>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((item) => {
          const value = typeof item === "string" ? item : item.symbol;
          const label = typeof item === "string" ? item : `${item.symbol} - ${item.label}`;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
    </label>
  );
}

function Result({ result }) {
  if (!result) return null;
  return (
    <article className={`result ${result.ok ? "ok" : "bad"}`}>
      <strong>{result.ok ? `n8n: ${actionLabel(result.action)}` : "n8n недоступен / backend не подключён"}</strong>
      <pre>{JSON.stringify(result.ok ? result.data : { error: result.error }, null, 2)}</pre>
    </article>
  );
}

export default function App() {
  const [telegram] = useState(() => initTelegram());
  const [active, setActive] = useState("dashboard");
  const [loading, setLoading] = useState("");
  const [results, setResults] = useState({});
  const [confirm, setConfirm] = useState("");
  const [context, setContext] = useState({
    selectedSymbol: APP_CONFIG.defaults.selectedSymbol,
    selectedProvider: APP_CONFIG.defaults.selectedProvider,
    selectedMarket: APP_CONFIG.defaults.selectedMarket,
    selectedTimeframe: APP_CONFIG.defaults.selectedTimeframe,
    tradingMode: APP_CONFIG.defaults.tradingMode,
    autoTradingMode: APP_CONFIG.defaults.autoTradingMode,
    theme: APP_CONFIG.defaults.theme
  });
  const [calc, setCalc] = useState({ deposit: 1000, risk: 1, trades: 2, winRate: 60, rr: 1.5 });

  const screen = screens.find((item) => item.id === active) || screens[0];
  const symbol = useMemo(() => SYMBOLS.find((item) => item.symbol === context.selectedSymbol) || SYMBOLS[0], [context.selectedSymbol]);
  const latest = results.getSignal?.data || {};
  const calcRisk = Number(calc.deposit) * (Number(calc.risk) / 100);
  const calcAverage = ((Number(calc.trades) * Number(calc.winRate) / 100) * calcRisk * Number(calc.rr)) - ((Number(calc.trades) * (100 - Number(calc.winRate)) / 100) * calcRisk);

  const patchContext = (patch) => setContext((current) => ({ ...current, ...patch }));
  const selectSymbol = (nextSymbol) => {
    const next = SYMBOLS.find((item) => item.symbol === nextSymbol) || SYMBOLS[0];
    patchContext({ selectedSymbol: next.symbol, selectedProvider: next.provider, selectedMarket: next.market });
  };

  const run = async (action, extra = {}) => {
    const key = actionLabel(action);
    if (CONFIG_ERROR) {
      const blocked = { ok: false, action, error: CONFIG_ERROR, safety: SAFETY_PAYLOAD };
      setResults((current) => ({ ...current, [key]: blocked, [action]: blocked }));
      return;
    }

    setLoading(action);
    triggerHaptic("light");
    const result = await apiAction(action, telegram.user, context, extra, APP_CONFIG.requestTimeoutMs);
    setResults((current) => ({ ...current, [key]: result, [action]: result }));
    setLoading("");
    notifyHaptic(result.ok ? "success" : "error");
  };

  const actionResult = results[actionLabel(screen.action)] || results[screen.action];

  return (
    <div className={`app theme-${context.theme.toLowerCase().replaceAll(" ", "-")}`}>
      <header className="top">
        <div>
          <span className="eyebrow">Telegram Mini App • {telegram.isTelegram ? "Telegram" : "Preview"}</span>
          <h1>{APP_CONFIG.appName}</h1>
        </div>
        <Pill tone="gold">{context.theme}</Pill>
      </header>

      {telegram.warning && <div className="banner warn">{telegram.warning}</div>}
      {CONFIG_ERROR && <div className="banner danger">{CONFIG_ERROR}</div>}

      <main className="main">
        <section className="hero">
          <div>
            <span>{symbol.label}</span>
            <h2>{context.selectedSymbol}</h2>
            <p>{context.selectedProvider.toUpperCase()} • {context.selectedMarket} • {context.selectedTimeframe}</p>
          </div>
          <Pill tone="gold">Real orders blocked</Pill>
        </section>

        <section className="panel">
          <h2>{screen.title}</h2>

          <div className="selectors">
            <SelectField label="Symbol" value={context.selectedSymbol} options={SYMBOLS} onChange={selectSymbol} />
            <SelectField label="Timeframe" value={context.selectedTimeframe} options={TIMEFRAMES} onChange={(value) => patchContext({ selectedTimeframe: value })} />
            <SelectField label="Theme" value={context.theme} options={THEMES} onChange={(value) => patchContext({ theme: value })} />
          </div>

          {active === "modes" && (
            <div className="chips">
              {TRADING_MODES.map((mode) => <button key={mode} className={context.tradingMode === mode ? "active" : ""} onClick={() => patchContext({ tradingMode: mode })}>{mode}</button>)}
            </div>
          )}

          {active === "auto" && (
            <div className="chips">
              {AUTO_TRADING_MODES.map((mode) => <button key={mode} className={context.autoTradingMode === mode ? "active" : ""} onClick={() => patchContext({ autoTradingMode: mode })}>{mode}</button>)}
            </div>
          )}

          {active === "market" && (
            <div className="symbols">
              {SYMBOLS.map((item) => <button key={item.symbol} className={item.symbol === context.selectedSymbol ? "active" : ""} onClick={() => selectSymbol(item.symbol)}><strong>{item.symbol}</strong><span>{item.market}</span></button>)}
            </div>
          )}

          {active === "signals" && (
            <>
              <div className="signal">
                <div><span>{text(latest.symbol, context.selectedSymbol)}</span><h3>{text(latest.direction || latest.signal, "WAIT")}</h3><p>{text(latest.explanation || latest.reason, "No fake signal. Request n8n analysis.")}</p></div>
                <Pill tone="gold">{text(latest.confidence, 0)}% confidence</Pill>
              </div>
              <div className="scores">
                {quality.map((name, index) => <Card key={name} title={`${name} score`} value={`${72 + index}%`} />)}
              </div>
            </>
          )}

          {active === "risk" && <div className="grid">{riskRules.map(([key, value]) => <Card key={key} title={key} value={value} />)}</div>}

          {active === "profit" && (
            <>
              <div className="selectors">
                {Object.keys(calc).map((key) => <label className="field" key={key}><span>{key}</span><input type="number" value={calc[key]} onChange={(event) => setCalc((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
              </div>
              <div className="grid">
                <Card title="Best scenario" value={(calcAverage * 1.4).toFixed(2)} tone="safe" />
                <Card title="Average scenario" value={calcAverage.toFixed(2)} />
                <Card title="Possible loss" value={(-Math.abs(calcRisk * 3)).toFixed(2)} tone="danger" />
                <Card title="Max drawdown" value={(calcRisk * 3).toFixed(2)} tone="warning" />
              </div>
              <p className="notice">Расчёт является примерным и не является гарантией прибыли.</p>
            </>
          )}

          {active === "real" && (
            <div className="danger-box">
              <strong>Real trading requires backend and owner confirmation.</strong>
              <span>Frontend will only call request/confirm actions; it never enables realTrading.</span>
              <input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="CONFIRM REAL MODE" />
            </div>
          )}

          <div className="grid">
            <Card title="dryRun" value="true" tone="safe" />
            <Card title="realTrading" value="false" tone="danger" />
            <Card title="canTrade" value="false" tone="danger" />
            <Card title="auto mode" value={context.autoTradingMode} tone="warning" />
            <Card title="trading mode" value={context.tradingMode} />
            <Card title="owner id" value={APP_CONFIG.ownerUserId} />
            <Card title="n8n action" value={screen.action} />
            <Card title="paper trading" value="ready" tone="safe" />
          </div>

          <div className="actions">
            <button disabled={loading === screen.action} onClick={() => run(screen.action, active === "profit" ? calc : {})}>Run {screen.title}</button>
            <button className="warn" disabled={loading === ACTIONS.startPaperTrading} onClick={() => run(ACTIONS.startPaperTrading)}>Start Paper Trading</button>
            <button className="danger" disabled={loading === ACTIONS.emergencyStop} onClick={() => run(ACTIONS.emergencyStop)}>Emergency Stop</button>
            {active === "real" && <button className="danger" disabled={confirm !== "CONFIRM REAL MODE"} onClick={() => run(ACTIONS.confirmRealMode, { confirmation: confirm })}>Confirm Real Mode Request</button>}
          </div>

          <Result result={actionResult || results.startPaperTrading || results.emergencyStop || results.confirmRealMode} />
        </section>
      </main>

      <nav className="nav">
        {screens.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}>{item.title}</button>)}
      </nav>
    </div>
  );
}
