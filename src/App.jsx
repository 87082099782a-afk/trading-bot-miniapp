import { useMemo, useState } from "react";
import { actionLabel, apiAction } from "./api.js";
import { ACTIONS, APP_CONFIG, CONFIG_ERROR, SAFETY_PAYLOAD, SYMBOLS, TIMEFRAMES, TRADING_MODES } from "./config.js";
import { initTelegram, notifyHaptic, triggerHaptic } from "./telegram.js";

const NAV = [
  ["home", "Главная", "⌂", ACTIONS.status],
  ["auto", "Авто-торговля", "↗", ACTIONS.autotuneStatus],
  ["signals", "Сигналы", "≋", ACTIONS.getSignal],
  ["trades", "Сделки", "▣", ACTIONS.getStats],
  ["profile", "Профиль", "◌", ACTIONS.getSettings]
].map(([id, label, icon, action]) => ({ id, label, icon, action }));

const MORE = [
  ["radar", "Радар возможностей", ACTIONS.getOpportunityRadar],
  ["multi", "Мультисигнальная панель", ACTIONS.getMultiSignal],
  ["plan", "Торговый план", ACTIONS.getTradePlan],
  ["paper", "Paper Trading", ACTIONS.startPaperTrading],
  ["real", "Real Trading Control", ACTIONS.requestRealMode],
  ["modes", "Торговые режимы", ACTIONS.status],
  ["risk", "Risk Manager", ACTIONS.status],
  ["profit", "Калькулятор прибыли", ACTIONS.calculateProfit],
  ["balance", "Баланс", ACTIONS.getBalance],
  ["statistics", "Статистика", ACTIONS.getStats],
  ["backtest", "Backtest", ACTIONS.backtest],
  ["watchlist", "Watchlist", ACTIONS.getPairRanking],
  ["advisor", "AI Advisor", ACTIONS.marketAnalysis],
  ["diagnostics", "Диагностика", ACTIONS.diagnostics],
  ["repair", "Self Repair", ACTIONS.selfRepair],
  ["logs", "Журнал активности", ACTIONS.getLogs],
  ["settings", "Настройки", ACTIONS.getSettings],
  ["emergency", "Экстренный стоп", ACTIONS.emergencyStop, "danger"]
].map(([id, title, action, tone]) => ({ id, title, action, tone }));

const QUICK = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSDT", "ETHUSDT"];
const FILTERS = ["Все", "BUY", "SELL", "WAIT", ">75%", "Metals", "Forex", "Crypto"];
const RISK = [["0.5%"], ["1%"], ["1.5%"], ["2%"], ["3%"]].flat();

const stored = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignored in private Telegram WebViews */ }
};
const value = (v, fallback = "—") => (v === undefined || v === null || v === "" ? fallback : String(v));

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Card({ title, children, action, className = "" }) {
  return <section className={`card ${className}`}>{title && <div className="card-head"><h2>{title}</h2>{action}</div>}{children}</section>;
}

function Metric({ label, children, tone = "neutral" }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value(children)}</strong></div>;
}

function Button({ children, tone = "green", onClick, disabled }) {
  return <button className={`btn ${tone}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

function Empty({ title, text }) {
  return <div className="empty"><strong>{title}</strong><p>{text}</p></div>;
}

function Toggle({ active, onClick }) {
  return <button className={`switch ${active ? "on" : ""}`} onClick={onClick}><span /></button>;
}

function Progress({ value: raw }) {
  const n = Number(raw);
  const pct = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  return <div className="progress"><span style={{ width: `${pct}%` }} /></div>;
}

function BottomNav({ active, onNav }) {
  return <nav className="bottom-nav">{NAV.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => onNav(item)}><b>{item.icon}</b><span>{item.label}</span></button>)}</nav>;
}

function TopBar({ backendOnline }) {
  return <header className="topbar"><div><p>AI Auto Trading Bot</p><h1>Trading Bot Control</h1></div><div className="top-actions"><Badge tone={backendOnline ? "green" : "red"}>{backendOnline ? "Подключено" : "Backend off"}</Badge><button aria-label="settings">⚙</button></div></header>;
}

function MarketPicker({ symbols, favorites, selected, onSelect, onFav, query, setQuery, tab, setTab }) {
  return <Card title="Выбор рынка"><label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск пары" /></label><div className="tabs">{["Favorites", "Metals", "Forex", "Crypto"].map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</div><div className="quick">{QUICK.map((s) => <button key={s} onClick={() => onSelect(s)}>{s}</button>)}</div><div className="market-list">{symbols.length ? symbols.map((item) => <article className={`market ${selected === item.symbol ? "selected" : ""}`} key={item.symbol}><button className={`star ${favorites.includes(item.symbol) ? "on" : ""}`} onClick={() => onFav(item.symbol)}>★</button><div><h3>{item.symbol}</h3><p>{item.label}</p></div><div className="badges"><Badge>{item.market}</Badge><Badge>{item.provider.toUpperCase()}</Badge></div><span className="muted">Status: ожидает backend</span><Button tone={selected === item.symbol ? "dark" : "green"} onClick={() => onSelect(item.symbol)}>{selected === item.symbol ? "Выбрано" : "Select"}</Button></article>) : <Empty title="Нет инструментов" text="Избранное пустое или поиск не дал результата." />}</div></Card>;
}

function SignalPanel({ signal, symbol, timeframe, backendOnline, onRequest }) {
  const direction = signal?.direction || signal?.signal || "WAIT";
  return <Card title="AI сигналы" action={<Badge tone={backendOnline ? "green" : "red"}>{backendOnline ? "live" : "offline"}</Badge>}><div className="signal-box"><div><p>{symbol}</p><h2 className={direction.toLowerCase()}>{direction}</h2></div><div className="round"><strong>{value(signal?.confidence)}</strong><span>%</span></div></div><Progress value={signal?.confidence} /><div className="levels"><Metric label="Вход">{signal?.entry}</Metric><Metric label="Stop Loss" tone="red">{signal?.stopLoss || signal?.sl}</Metric><Metric label="TP1" tone="green">{signal?.takeProfit1 || signal?.tp1}</Metric><Metric label="TP2" tone="green">{signal?.takeProfit2 || signal?.tp2}</Metric><Metric label="TP3" tone="green">{signal?.takeProfit3 || signal?.tp3}</Metric><Metric label="Risk/Reward">{signal?.riskReward}</Metric><Metric label="Timeframe">{timeframe}</Metric><Metric label="Risk level">{signal?.riskLevel}</Metric></div>{!backendOnline && <Empty title="n8n backend недоступен" text="Реальные сигналы пока не получены. Fake signals не показываются." />}<div className="ai-note"><strong>Обоснование AI</strong><p>{value(signal?.explanation || signal?.reason, "Нет реального ответа от n8n backend.")}</p></div><Button onClick={onRequest}>Запросить сигнал</Button></Card>;
}

function Home({ ctx, selected, backendOnline, brokerStatus, signal, onSignal, onMarket, onRun }) {
  return <div className="screen"><Card className="hero"><div className="pair-row"><div><h3>{ctx.selectedSymbol}</h3><p>{selected.label}</p></div><Badge tone={backendOnline ? "green" : "red"}>{backendOnline ? "Подключено" : "Не подключено"}</Badge></div><div className="price-line"><strong>{value(signal?.price)}</strong><span>{value(signal?.change)}</span></div><div className="mini-chart"><span /></div><div className="status-line"><span>Режим</span><b>Paper / Analysis only</b></div><div className="status-line"><span>Real trading</span><b className="red">BLOCKED</b></div><div className="two-buttons"><Button onClick={onSignal}>Open Signal</Button><Button tone="dark" onClick={onMarket}>Change Market</Button></div></Card><div className="grid"><Metric label="Backend" tone={backendOnline ? "green" : "red"}>{backendOnline ? "подключён" : "Backend не подключён"}</Metric><Metric label="Broker" tone="red">{brokerStatus}</Metric><Metric label="Real Trading" tone="red">blocked</Metric><Metric label="Paper Trading">{signal?.paperActive ? "active" : "inactive"}</Metric><Metric label="Today signals">{signal?.todaySignals}</Metric><Metric label="Risk status">safe flags</Metric></div><Card title="Быстрые действия"><div className="quick-actions"><Button onClick={() => onRun(ACTIONS.startPaperTrading)}>Запустить авто-торговлю</Button><Button tone="red" onClick={() => onRun(ACTIONS.stop)}>Остановить бота</Button></div></Card></div>;
}

function AutoTrade({ ctx, update, run }) {
  return <div className="screen"><Card title="Авто-торговля" action={<Badge tone="green">safe</Badge>}><div className="settings-list"><div><span>Режим бота</span><Badge tone="green">Analysis only</Badge></div><div><span>Режим стратегии</span><button onClick={() => run(ACTIONS.status)}>Скальпинг ›</button></div><div><span>Таймфрейм</span><div className="chips">{TIMEFRAMES.slice(0, 4).map((tf) => <button key={tf} className={ctx.selectedTimeframe === tf ? "active" : ""} onClick={() => update({ selectedTimeframe: tf })}>{tf}</button>)}</div></div><div><span>Risk на сделку</span><b>1.5%</b></div><div><span>Только сильный сигнал</span><Toggle active onClick={() => run(ACTIONS.saveSettings)} /></div><div><span>Auto SL/TP</span><Toggle active onClick={() => run(ACTIONS.saveSettings)} /></div><div><span>Трейлинг-стоп</span><Toggle active onClick={() => run(ACTIONS.saveSettings)} /></div></div><Button onClick={() => run(ACTIONS.autotuneStatus)}>Сохранить настройки</Button></Card></div>;
}

function Trades({ signal, run }) {
  return <div className="screen"><Card title="Активные сделки" action={<button className="filter" onClick={() => run(ACTIONS.getStats)}>Фильтр⌄</button>}>{signal?.trades?.length ? signal.trades.map((t) => <div className="trade" key={t.id}><div><b>{t.symbol}</b><Badge tone={t.side === "SELL" ? "red" : "green"}>{t.side}</Badge></div><Metric label="PnL" tone={Number(t.pnl) >= 0 ? "green" : "red"}>{t.pnl}</Metric></div>) : <Empty title="Нет реальных сделок" text="Fake trades не показываются. Подключите backend/provider." />}<Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>Экстренно остановить всё</Button></Card></div>;
}

function Profile({ run, openMore }) {
  return <div className="screen"><Card title="Профиль"><div className="profile"><div className="avatar">◉</div><div><h3>Trader Pro</h3><p>ID: 8300266144</p></div><Badge tone="gold">VIP Pro</Badge></div><button className="row" onClick={() => run(ACTIONS.getSettings)}>Настройки аккаунта ›</button><button className="row" onClick={() => openMore("risk")}>Безопасность ›</button><button className="row" onClick={() => openMore("logs")}>Журнал активности ›</button><button className="row red" onClick={() => run(ACTIONS.emergencyStop)}>Экстренный стоп ›</button></Card><Card title="More"><div className="more-list">{MORE.map((item) => <button key={item.id} className={item.tone === "danger" ? "danger" : ""} onClick={() => openMore(item.id)}>{item.title}</button>)}</div></Card></div>;
}

function Sheet({ item, onClose, run, confirm, setConfirm }) {
  if (!item) return null;
  const real = item.id === "real";
  const emergency = item.id === "emergency";
  return <div className="sheet"><div className="sheet-card"><div className="sheet-head"><h2>{item.title}</h2><button onClick={onClose}>×</button></div>{emergency ? <div className="emergency"><div>!</div><strong>Остановить бота и все сделки?</strong><p>Запрос уйдёт в n8n. Frontend не закрывает сделки напрямую.</p><Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>ОСТАНОВИТЬ ВСЁ</Button><Button tone="dark" onClick={onClose}>Отмена</Button></div> : real ? <div className="settings-list"><Empty title="Real Trading заблокирован" text="dryRun=true, realTrading=false, canTrade=false. Автоматически реальные сделки не включаются." /><input className="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="CONFIRM REAL MODE" /><Button tone="red" disabled={confirm !== "CONFIRM REAL MODE"} onClick={() => run(ACTIONS.confirmRealMode, { confirmation: confirm })}>Request real mode</Button></div> : <><Empty title="Ожидает backend" text="Раздел покажет реальные данные после ответа n8n backend." /><Button onClick={() => run(item.action, { feature: item.id })}>Запросить данные</Button></>}</div></div>;
}

export default function App() {
  const [telegram] = useState(() => initTelegram());
  const [active, setActive] = useState("home");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState("");
  const [tab, setTab] = useState("Favorites");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(() => stored("favorites", ["XAUUSD", "BTCUSDT"]));
  const [sheet, setSheet] = useState(null);
  const [confirm, setConfirm] = useState("");
  const [ctx, setCtx] = useState(() => ({ selectedSymbol: stored("selectedSymbol", APP_CONFIG.defaults.selectedSymbol), selectedProvider: stored("selectedProvider", APP_CONFIG.defaults.selectedProvider), selectedMarket: stored("selectedMarket", APP_CONFIG.defaults.selectedMarket), selectedTimeframe: stored("selectedTimeframe", APP_CONFIG.defaults.selectedTimeframe), tradingMode: stored("tradingMode", APP_CONFIG.defaults.tradingMode), autoTradingMode: APP_CONFIG.defaults.autoTradingMode }));

  const selected = useMemo(() => SYMBOLS.find((s) => s.symbol === ctx.selectedSymbol) || SYMBOLS[0], [ctx.selectedSymbol]);
  const backendOnline = Object.values(results).some((r) => r?.ok);
  const signal = results.getSignal?.ok ? results.getSignal.data : null;
  const mt5 = Boolean(results.status?.data?.mt5Connected || results.diagnostics?.data?.mt5Connected);
  const binance = Boolean(results.status?.data?.binanceConnected || results.diagnostics?.data?.binanceConnected);
  const brokerStatus = selected.provider === "mt5" ? (mt5 ? "MT5 подключён" : "MT5 provider не подключён") : (binance ? "Binance подключён" : "Binance credentials не подключены");

  const run = async (action, extra = {}, nextCtx = ctx) => {
    const key = actionLabel(action);
    if (CONFIG_ERROR) {
      const blocked = { ok: false, action, error: CONFIG_ERROR, safety: SAFETY_PAYLOAD };
      setResults((cur) => ({ ...cur, [key]: blocked, [action]: blocked }));
      return blocked;
    }
    setLoading(action);
    triggerHaptic("light");
    const res = await apiAction(action, telegram.user, nextCtx, extra, APP_CONFIG.requestTimeoutMs);
    setResults((cur) => ({ ...cur, [key]: res, [action]: res }));
    setLoading("");
    notifyHaptic(res.ok ? "success" : "error");
    return res;
  };

  const update = (patch) => {
    const next = { ...ctx, ...patch };
    setCtx(next);
    Object.entries(patch).forEach(([k, v]) => save(k, v));
    run(ACTIONS.saveSettings, { uiEvent: "settings_update", ...patch }, next);
  };
  const selectSymbol = (symbol) => {
    const next = SYMBOLS.find((s) => s.symbol === symbol) || SYMBOLS[0];
    update({ selectedSymbol: next.symbol, selectedProvider: next.provider, selectedMarket: next.market });
  };
  const fav = (symbol) => {
    const next = favorites.includes(symbol) ? favorites.filter((s) => s !== symbol) : [symbol, ...favorites].slice(0, 10);
    setFavorites(next);
    save("favorites", next);
    run(ACTIONS.saveSettings, { favorites: next });
  };
  const nav = (item) => { setActive(item.id); run(item.action, { uiEvent: "nav", screen: item.id }); };
  const openMore = (id) => { const item = MORE.find((m) => m.id === id); if (item) { setSheet(item); run(item.action, { uiEvent: "open_more", feature: id }); } };

  const filtered = SYMBOLS.filter((s) => (tab === "Favorites" ? favorites.includes(s.symbol) : s.market === tab.toLowerCase()) && (!query || `${s.symbol} ${s.label}`.toLowerCase().includes(query.toLowerCase())));

  return <div className="app"><TopBar backendOnline={backendOnline} />{telegram.warning && <Empty title="Открыто вне Telegram" text="Доступен preview без сделок." />}{loading && <div className="loading">Запрос в n8n...</div>}{active === "home" && <Home ctx={ctx} selected={selected} backendOnline={backendOnline} brokerStatus={brokerStatus} signal={signal} onSignal={() => { setActive("signals"); run(ACTIONS.getSignal); }} onMarket={() => { setActive("auto"); run(ACTIONS.getSymbols); }} onRun={run} />}{active === "auto" && <AutoTrade ctx={ctx} update={update} run={run} />}{active === "signals" && <div className="screen"><div className="tabs">{FILTERS.map((f) => <button key={f} onClick={() => run(ACTIONS.getSignal, { filter: f })}>{f}</button>)}</div><SignalPanel signal={signal} symbol={ctx.selectedSymbol} timeframe={ctx.selectedTimeframe} backendOnline={backendOnline} onRequest={() => run(ACTIONS.getSignal)} /><MarketPicker symbols={filtered} favorites={favorites} selected={ctx.selectedSymbol} onSelect={selectSymbol} onFav={fav} query={query} setQuery={setQuery} tab={tab} setTab={setTab} /></div>}{active === "trades" && <Trades signal={signal} run={run} />}{active === "profile" && <Profile run={run} openMore={openMore} />}<Sheet item={sheet} onClose={() => setSheet(null)} run={run} confirm={confirm} setConfirm={setConfirm} /><BottomNav active={active} onNav={nav} /></div>;
}
