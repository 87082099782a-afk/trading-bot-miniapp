import { useMemo, useState } from "react";
import { apiCall } from "./api.js";
import { APP_CONFIG, CONFIG_ERROR, ENDPOINTS, SAFETY_PAYLOAD } from "./config.js";
import { initTelegram, notifyHaptic, triggerHaptic } from "./telegram.js";

const EMPTY = {
  status: {
    mode: "DEMO",
    symbol: "BTCUSDT",
    timeframe: "5m",
    lastRsi: "Waiting",
    lastSignal: "WAIT",
    binanceStatus: "Not checked",
    telegramStatus: "Preview",
    openAiStatus: "Not checked",
    perplexityStatus: "Not checked",
    emergencyStop: "Ready"
  },
  signal: {
    symbol: "BTCUSDT",
    timeframe: "5m",
    rsi: "Waiting",
    signal: "WAIT",
    lastClose: "Waiting",
    candlesCount: "Waiting",
    reason: "No signal requested yet"
  },
  balance: {
    usdt: "Hidden",
    btc: "Hidden",
    binanceStatus: "Not checked",
    message: "Binance credentials не настроены или недоступны."
  },
  statistics: {
    signalsToday: 0,
    buy: 0,
    sell: 0,
    hold: 0,
    wait: 0,
    errors: 0,
    lastCheck: "Waiting",
    mode: "demo"
  },
  settings: {
    symbol: APP_CONFIG.defaults.symbol,
    timeframe: APP_CONFIG.defaults.timeframe,
    rsiPeriod: APP_CONFIG.defaults.rsiPeriod,
    candlesLimit: APP_CONFIG.defaults.candlesLimit,
    maxTradeAmount: APP_CONFIG.defaults.maxTradeAmount
  }
};

const TABS = [
  ["dashboard", "Dashboard", "Dash"],
  ["controls", "Controls", "Control"],
  ["signals", "Signals", "Signal"],
  ["balance", "Balance", "Balance"],
  ["statistics", "Statistics", "Stats"],
  ["analysis", "Market Analysis", "AI"],
  ["strategy", "Strategy Test", "Test"],
  ["diagnostics", "Diagnostics", "Diag"],
  ["repair", "Auto Repair", "Repair"],
  ["logs", "Error Logs", "Logs"],
  ["settings", "Settings", "Set"],
  ["real-mode", "Real Mode", "Real"]
].map(([id, label, short]) => ({ id, label, short }));

const DIAGNOSTIC_CHECKS = [
  "Telegram",
  "n8n webhooks",
  "Binance",
  "OpenAI",
  "Perplexity",
  "RSI",
  "Balance",
  "Logs",
  "Error handlers"
];

const text = (value, fallback = "Waiting") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

const pick = (source, keys, fallback) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== "") {
      return source[key];
    }
  }
  return fallback;
};

const normalize = {
  status: (data = {}) => ({
    mode: "DEMO",
    symbol: pick(data, ["symbol", "pair"], EMPTY.status.symbol),
    timeframe: pick(data, ["timeframe", "interval"], EMPTY.status.timeframe),
    lastRsi: pick(data, ["lastRsi", "rsi"], EMPTY.status.lastRsi),
    lastSignal: pick(data, ["lastSignal", "signal"], EMPTY.status.lastSignal),
    binanceStatus: pick(data, ["binanceStatus", "binance"], EMPTY.status.binanceStatus),
    telegramStatus: pick(data, ["telegramStatus", "telegram"], EMPTY.status.telegramStatus),
    openAiStatus: pick(data, ["openAiStatus", "openAIStatus", "openai"], EMPTY.status.openAiStatus),
    perplexityStatus: pick(data, ["perplexityStatus", "perplexity"], EMPTY.status.perplexityStatus),
    emergencyStop: pick(data, ["emergencyStop", "emergency"], EMPTY.status.emergencyStop)
  }),
  signal: (data = {}) => ({
    symbol: pick(data, ["symbol", "pair"], EMPTY.signal.symbol),
    timeframe: pick(data, ["timeframe", "interval"], EMPTY.signal.timeframe),
    rsi: pick(data, ["rsi", "lastRsi"], EMPTY.signal.rsi),
    signal: pick(data, ["signal", "lastSignal"], EMPTY.signal.signal),
    lastClose: pick(data, ["lastClose", "close"], EMPTY.signal.lastClose),
    candlesCount: pick(data, ["candlesCount", "candles"], EMPTY.signal.candlesCount),
    reason: pick(data, ["reason", "message"], EMPTY.signal.reason)
  }),
  balance: (data = {}) => ({
    usdt: pick(data, ["usdt", "USDT"], EMPTY.balance.usdt),
    btc: pick(data, ["btc", "BTC"], EMPTY.balance.btc),
    binanceStatus: pick(data, ["binanceStatus", "status"], EMPTY.balance.binanceStatus),
    message: pick(data, ["message", "error"], EMPTY.balance.message)
  }),
  statistics: (data = {}) => ({
    signalsToday: pick(data, ["signalsToday", "signals_today"], EMPTY.statistics.signalsToday),
    buy: pick(data, ["buy", "BUY"], EMPTY.statistics.buy),
    sell: pick(data, ["sell", "SELL"], EMPTY.statistics.sell),
    hold: pick(data, ["hold", "HOLD"], EMPTY.statistics.hold),
    wait: pick(data, ["wait", "WAIT"], EMPTY.statistics.wait),
    errors: pick(data, ["errors"], EMPTY.statistics.errors),
    lastCheck: pick(data, ["lastCheck", "last_check"], EMPTY.statistics.lastCheck),
    mode: "demo"
  }),
  settings: (data = {}) => ({
    symbol: pick(data, ["symbol"], EMPTY.settings.symbol),
    timeframe: pick(data, ["timeframe"], EMPTY.settings.timeframe),
    rsiPeriod: pick(data, ["rsiPeriod", "rsi_period"], EMPTY.settings.rsiPeriod),
    candlesLimit: pick(data, ["candlesLimit", "candles_limit"], EMPTY.settings.candlesLimit),
    maxTradeAmount: pick(data, ["maxTradeAmount", "max_trade_amount"], EMPTY.settings.maxTradeAmount)
  })
};

function Pill({ tone = "safe", children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function Card({ title, value, tone = "neutral" }) {
  return (
    <article className={`info-card tone-${tone}`}>
      <span>{title}</span>
      <strong>{text(value)}</strong>
    </article>
  );
}

function Button({ children, tone = "safe", disabled, onClick }) {
  return (
    <button className={`action-button ${tone}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function Header({ title, action }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

function Result({ title, result }) {
  if (!result) return null;
  return (
    <div className={`result-panel ${result.ok ? "success" : "error"}`}>
      <strong>{title}</strong>
      <pre>{JSON.stringify(result.ok ? result.data : { error: result.error }, null, 2)}</pre>
    </div>
  );
}

function LoadButton({ loading, onClick, label = "Load" }) {
  return (
    <button className="ghost-button" disabled={loading} onClick={onClick}>
      {label}
    </button>
  );
}

export default function App() {
  const [telegram] = useState(() => initTelegram());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loadingKey, setLoadingKey] = useState("");
  const [data, setData] = useState(EMPTY);
  const [results, setResults] = useState({});
  const [confirmText, setConfirmText] = useState("");

  const active = useMemo(() => TABS.find((tab) => tab.id === activeTab) || TABS[0], [activeTab]);

  const run = async (key, endpoint, payload = {}) => {
    if (CONFIG_ERROR) {
      const blocked = { ok: false, error: CONFIG_ERROR, safety: SAFETY_PAYLOAD };
      setResults((current) => ({ ...current, [key]: blocked }));
      return blocked;
    }

    setLoadingKey(key);
    triggerHaptic("light");
    const result = await apiCall(endpoint, telegram.user, payload, APP_CONFIG.requestTimeoutMs);
    setResults((current) => ({ ...current, [key]: result }));
    setLoadingKey("");
    notifyHaptic(result.ok ? "success" : "error");
    return result;
  };

  const load = async (key, endpoint = ENDPOINTS[key]) => {
    const result = await run(key, endpoint);
    if (result.ok && normalize[key]) {
      setData((current) => ({ ...current, [key]: normalize[key](result.data) }));
    }
  };

  const screen = {
    dashboard: (
      <section className="screen">
        <Header title="Dashboard" action={<LoadButton label="Refresh" loading={loadingKey === "status"} onClick={() => load("status")} />} />
        <div className="hero-panel">
          <div>
            <p>Mode</p>
            <h1>DEMO</h1>
          </div>
          <Pill>Real order blocked: true</Pill>
        </div>
        <div className="card-grid">
          <Card title="Dry run" value="true" tone="safe" />
          <Card title="Real trading" value="false" tone="danger" />
          <Card title="Can trade" value="false" tone="danger" />
          <Card title="Emergency stop" value={data.status.emergencyStop} tone="warning" />
          <Card title="Symbol" value={data.status.symbol} />
          <Card title="Timeframe" value={data.status.timeframe} />
          <Card title="Last RSI" value={data.status.lastRsi} />
          <Card title="Last signal" value={data.status.lastSignal} />
          <Card title="Binance status" value={data.status.binanceStatus} />
          <Card title="Telegram status" value={data.status.telegramStatus} />
          <Card title="OpenAI status" value={data.status.openAiStatus} />
          <Card title="Perplexity status" value={data.status.perplexityStatus} />
        </div>
      </section>
    ),
    controls: (
      <section className="screen">
        <Header title="Controls" />
        <div className="action-stack">
          <Button disabled={loadingKey === "startDemo"} onClick={() => run("startDemo", ENDPOINTS.startDemo)}>Start Demo</Button>
          <Button tone="warning" disabled={loadingKey === "stop"} onClick={() => run("stop", ENDPOINTS.stop)}>Stop Bot</Button>
          <Button tone="danger" disabled={loadingKey === "emergencyStop"} onClick={() => run("emergencyStop", ENDPOINTS.emergencyStop)}>Emergency Stop</Button>
          <Button tone="warning" disabled={loadingKey === "requestRealMode"} onClick={() => run("requestRealMode", ENDPOINTS.requestRealMode)}>Request Real Mode</Button>
        </div>
        <Result title="Action result" result={results.startDemo || results.stop || results.emergencyStop || results.requestRealMode} />
      </section>
    ),
    signals: (
      <section className="screen">
        <Header title="Signals" action={<LoadButton loading={loadingKey === "signal"} onClick={() => load("signal")} />} />
        <div className="card-grid">
          <Card title="Symbol" value={data.signal.symbol} />
          <Card title="Timeframe" value={data.signal.timeframe} />
          <Card title="RSI" value={data.signal.rsi} />
          <Card title="Signal" value={data.signal.signal} tone="warning" />
          <Card title="Last close" value={data.signal.lastClose} />
          <Card title="Candles count" value={data.signal.candlesCount} />
          <Card title="Reason" value={data.signal.reason} />
          <Card title="Real order blocked" value="true" tone="safe" />
        </div>
        <Result title="Signal result" result={results.signal} />
      </section>
    ),
    balance: (
      <section className="screen">
        <Header title="Balance" />
        <Button disabled={loadingKey === "balance"} onClick={() => load("balance")}>Check Balance</Button>
        <div className="card-grid">
          <Card title="USDT" value={data.balance.usdt} />
          <Card title="BTC" value={data.balance.btc} />
          <Card title="Binance status" value={data.balance.binanceStatus} tone="warning" />
        </div>
        <p className="notice">{data.balance.message}</p>
        <Result title="Balance result" result={results.balance} />
      </section>
    ),
    statistics: (
      <section className="screen">
        <Header title="Statistics" action={<LoadButton loading={loadingKey === "statistics"} onClick={() => load("statistics")} />} />
        <div className="card-grid">
          <Card title="Signals today" value={data.statistics.signalsToday} />
          <Card title="BUY" value={data.statistics.buy} tone="safe" />
          <Card title="SELL" value={data.statistics.sell} tone="danger" />
          <Card title="HOLD" value={data.statistics.hold} tone="warning" />
          <Card title="WAIT" value={data.statistics.wait} />
          <Card title="Errors" value={data.statistics.errors} tone="danger" />
          <Card title="Last check" value={data.statistics.lastCheck} />
          <Card title="Mode" value={data.statistics.mode} tone="safe" />
        </div>
        <Result title="Statistics result" result={results.statistics} />
      </section>
    ),
    analysis: (
      <section className="screen">
        <Header title="Market Analysis" />
        <Button disabled={loadingKey === "analysis"} onClick={() => run("analysis", ENDPOINTS.analysis)}>Run AI Analysis</Button>
        <div className="detail-panel">
          <p><strong>Market summary:</strong> {text(pick(results.analysis?.data, ["summary", "analysis"], "Waiting for analysis"))}</p>
          <p><strong>Recommendation:</strong> {text(pick(results.analysis?.data, ["recommendation"], "No trade recommendation yet"))}</p>
          <p><strong>Warning:</strong> реальные сделки отключены.</p>
        </div>
        <Result title="Analysis result" result={results.analysis} />
      </section>
    ),
    strategy: (
      <section className="screen">
        <Header title="Strategy Test" />
        <Button disabled={loadingKey === "strategyTest"} onClick={() => run("strategyTest", ENDPOINTS.strategyTest)}>Run Strategy Test</Button>
        <div className="card-grid">
          <Card title="RSI" value={pick(results.strategyTest?.data, ["rsi"], "Waiting")} />
          <Card title="Signal" value={pick(results.strategyTest?.data, ["signal"], "WAIT")} tone="warning" />
          <Card title="Demo action" value={pick(results.strategyTest?.data, ["demoAction", "message"], "No demo action yet")} />
          <Card title="Real order blocked" value="true" tone="safe" />
        </div>
        <Result title="Strategy test result" result={results.strategyTest} />
      </section>
    ),
    diagnostics: (
      <section className="screen">
        <Header title="Diagnostics" />
        <Button disabled={loadingKey === "diagnostics"} onClick={() => run("diagnostics", ENDPOINTS.diagnostics)}>Run Diagnostics</Button>
        <div className="check-list">
          {DIAGNOSTIC_CHECKS.map((check) => (
            <div className="check-row" key={check}>
              <span>{check}</span>
              <Pill tone="warning">{text(results.diagnostics?.data?.[check] || results.diagnostics?.data?.[check.toLowerCase()] || "Pending")}</Pill>
            </div>
          ))}
        </div>
        <Result title="Diagnostics result" result={results.diagnostics} />
      </section>
    ),
    repair: (
      <section className="screen">
        <Header title="Auto Repair" />
        <Button tone="warning" disabled={loadingKey === "repair"} onClick={() => run("repair", ENDPOINTS.repair)}>Safe Auto Repair</Button>
        <div className="card-grid">
          <Card title="Found error" value={pick(results.repair?.data, ["foundError", "error"], "Waiting")} tone="danger" />
          <Card title="Problem node" value={pick(results.repair?.data, ["problemNode", "node"], "Waiting")} />
          <Card title="Proposed fix" value={pick(results.repair?.data, ["proposedFix", "fix"], "Waiting")} />
          <Card title="Backup version" value={pick(results.repair?.data, ["backupVersion", "backup"], "Waiting")} />
          <Card title="Test passed" value={pick(results.repair?.data, ["testPassed"], "Waiting")} tone="safe" />
          <Card title="Real trading" value="false" tone="danger" />
        </div>
        <Result title="Repair result" result={results.repair} />
      </section>
    ),
    logs: (
      <section className="screen">
        <Header title="Error Logs" action={<LoadButton loading={loadingKey === "logs"} onClick={() => run("logs", ENDPOINTS.logs)} />} />
        <div className="log-list">
          {(Array.isArray(results.logs?.data?.logs) && results.logs.data.logs.length
            ? results.logs.data.logs
            : [{ time: "Waiting", node: "n8n", error: "No logs loaded", reason: "Pending request", status: "Preview", nextAction: "Load logs" }]
          ).map((row, index) => (
            <article className="log-row" key={`${row.time}-${index}`}>
              <strong>{text(row.time)}</strong>
              <span>Node: {text(row.node)}</span>
              <span>Error: {text(row.error)}</span>
              <span>Reason: {text(row.reason)}</span>
              <span>Status: {text(row.status)}</span>
              <span>Next action: {text(row.nextAction || row.next_action)}</span>
            </article>
          ))}
        </div>
        <Result title="Logs result" result={results.logs} />
      </section>
    ),
    settings: (
      <section className="screen">
        <Header title="Settings" action={<LoadButton loading={loadingKey === "settings"} onClick={() => load("settings")} />} />
        <div className="card-grid">
          <Card title="Symbol" value={data.settings.symbol} />
          <Card title="Timeframe" value={data.settings.timeframe} />
          <Card title="RSI period" value={data.settings.rsiPeriod} />
          <Card title="Candles limit" value={data.settings.candlesLimit} />
          <Card title="Max trade amount" value={data.settings.maxTradeAmount} tone="warning" />
          <Card title="Dry run" value="true" tone="safe" />
          <Card title="Real trading" value="false" tone="danger" />
          <Card title="Can trade" value="false" tone="danger" />
        </div>
        <Result title="Settings result" result={results.settings} />
      </section>
    ),
    "real-mode": (
      <section className="screen">
        <Header title="Real Mode" />
        <div className="danger-panel">
          <strong>Real Mode может открыть реальные сделки на Binance.</strong>
          <span>Для включения нужно ручное подтверждение.</span>
          <span>Сейчас реальные сделки заблокированы.</span>
        </div>
        <label className="input-label" htmlFor="real-mode-confirm">CONFIRM REAL MODE</label>
        <input
          id="real-mode-confirm"
          className="confirm-input"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="CONFIRM REAL MODE"
        />
        <Button
          tone="danger"
          disabled={confirmText !== "CONFIRM REAL MODE" || loadingKey === "confirmRealMode"}
          onClick={() => run("confirmRealMode", ENDPOINTS.confirmRealMode, { confirmation: confirmText })}
        >
          Confirm Request
        </Button>
        <div className="card-grid">
          <Card title="Frontend real trading" value="false" tone="danger" />
          <Card title="Payload dryRun" value="true" tone="safe" />
          <Card title="Payload canTrade" value="false" tone="danger" />
          <Card title="Real order blocked" value="true" tone="safe" />
        </div>
        <Result title="Real mode request" result={results.confirmRealMode} />
      </section>
    )
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <span className="eyebrow">Telegram Mini App</span>
          <h1>{APP_CONFIG.appName}</h1>
        </div>
        <Pill>DEMO</Pill>
      </header>

      {telegram.warning && <div className="banner warning">{telegram.warning}</div>}
      {CONFIG_ERROR && <div className="banner danger">{CONFIG_ERROR}</div>}

      <main className="content-shell">
        <div className="user-strip">
          <span>User: {text(telegram.user.firstName || telegram.user.username || telegram.user.id)}</span>
          <span>ID: {text(telegram.user.id)}</span>
        </div>
        <div className="active-title">{active.label}</div>
        {screen[activeTab]}
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTab ? "active" : ""}
            onClick={() => {
              setActiveTab(tab.id);
              triggerHaptic("light");
            }}
          >
            {tab.short}
          </button>
        ))}
      </nav>
    </div>
  );
}
