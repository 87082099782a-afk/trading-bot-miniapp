import { useMemo, useState } from "react";
import { actionLabel, apiAction } from "./api.js";
import { ACTIONS, APP_CONFIG, CONFIG_ERROR, SAFETY_PAYLOAD, SYMBOLS, TIMEFRAMES, TRADING_MODES } from "./config.js";
import { initTelegram, notifyHaptic, triggerHaptic } from "./telegram.js";

const NAV = [
  ["home", "Главная", "⌂", ACTIONS.status],
  ["auto", "Авто-торговля", "↗", ACTIONS.autotuneStatus],
  ["signals", "Сигналы", "≋", ACTIONS.getSignal],
  ["deals", "Сделки", "▣", ACTIONS.getStats],
  ["profile", "Профиль", "◌", ACTIONS.getSettings]
].map(([id, label, icon, action]) => ({ id, label, icon, action }));

const FEATURES = [
  ["risk", "Risk Manager", ACTIONS.status],
  ["stats", "Статистика", ACTIONS.getStats],
  ["history", "История сделок", ACTIONS.getStats],
  ["strategy", "Настройки стратегии", ACTIONS.getSettings],
  ["news", "Новости и календарь", ACTIONS.marketAnalysis],
  ["notifications", "Уведомления", ACTIONS.getSettings],
  ["journal", "Журнал активности", ACTIONS.getLogs],
  ["position", "Управление позицией", ACTIONS.getStats],
  ["equity", "График доходности", ACTIONS.getStats],
  ["modes", "Режимы стратегии", ACTIONS.status],
  ["quality", "Качество рынка", ACTIONS.marketAnalysis],
  ["quick", "Быстрые действия", ACTIONS.status],
  ["emergency", "Экстренный стоп", ACTIONS.emergencyStop]
].map(([id, title, action]) => ({ id, title, action }));

const noData = "—";
const stored = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Telegram WebView can block localStorage.
  }
};
const show = (value, fallback = noData) => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

function Shell({ children, active, onNav, loading }) {
  return (
    <div className="app">
      {loading && <div className="loading-line">Запрос в n8n...</div>}
      {children}
      <nav className="bottom-nav">
        {NAV.map((item) => (
          <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => onNav(item)}>
            <b>{item.icon}</b>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Header({ title, right, sub }) {
  return (
    <header className="screen-header">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </header>
  );
}
function Card({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Button({ children, tone = "green", onClick, disabled }) {
  return <button className={`btn ${tone}`} disabled={disabled} onClick={onClick}>{children}</button>;
}
function Row({ label, value, children, tone = "" }) {
  return <div className="row"><span>{label}</span>{children || <b className={tone}>{show(value)}</b>}</div>;
}
function Metric({ label, value, tone = "" }) {
  return <div className="metric"><span>{label}</span><b className={tone}>{show(value)}</b></div>;
}
function Toggle({ checked, onClick }) {
  return <button className={`toggle ${checked ? "on" : ""}`} onClick={onClick}><span /></button>;
}
function Tabs({ items, active, onSelect }) {
  return <div className="tabs">{items.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => onSelect(item)}>{item}</button>)}</div>;
}
function MiniChart() {
  return (
    <div className="mini-chart" aria-hidden="true">
      {[38, 46, 35, 58, 52, 68, 61, 74, 65, 79, 70, 86].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
      <svg viewBox="0 0 320 90" preserveAspectRatio="none"><path d="M0 72 L24 62 L48 66 L72 48 L96 55 L120 37 L144 42 L168 29 L192 35 L216 21 L240 30 L264 18 L288 24 L320 12" /></svg>
    </div>
  );
}
function CandleChart() {
  return <div className="chart-card">{Array.from({ length: 34 }).map((_, index) => <i key={index} className={index % 3 !== 0 ? "up" : "down"} style={{ height: `${22 + ((index * 13) % 58)}px` }} />)}</div>;
}
function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

function HomeScreen({ ctx, symbol, status, signal, run, go }) {
  return (
    <div className="screen">
      <Header title="AI Auto Trading Bot" right={<button className="icon-btn">♧</button>} />
      <Card className="asset-card">
        <div className="asset-top"><div><h2>{ctx.selectedSymbol}</h2><p>{symbol.label}</p></div><Badge tone={status.backend ? "green" : "red"}>{status.backend ? "Подключено" : "Не подключено"}</Badge></div>
        <strong className="price">{show(signal?.price)}</strong>
        <span className="gain">{show(signal?.change, "Backend не подключён")}</span>
        <MiniChart />
        <Row label="Баланс" value={signal?.balance} />
        <Row label="Дневная прибыль" value={signal?.dailyProfit} tone="green" />
        <Row label="Общий PNL" value={signal?.pnl} tone="green" />
        <Row label="Статус бота"><b className="red">REAL BLOCKED</b></Row>
        <Button onClick={() => run(ACTIONS.startPaperTrading)}>↗ ЗАПУСТИТЬ АВТО-ТОРГОВЛЮ</Button>
        <Button tone="red" onClick={() => run(ACTIONS.stop)}>⊗ ОСТАНОВИТЬ БОТА</Button>
        <div className="mini-grid three"><Metric label="AI сигнал" value={signal?.direction || "WAIT"} tone="green" /><Metric label="Активные сделки" value={signal?.activeDeals} /><Metric label="Риск сегодня" value={signal?.riskToday} tone="green" /></div>
      </Card>
      <Card><div className="quick-grid"><Button onClick={() => go("signals")}>Открыть сигнал</Button><Button tone="dark" onClick={() => go("auto")}>Настройки</Button></div></Card>
    </div>
  );
}

function AutoScreen({ ctx, update, run }) {
  return (
    <div className="screen">
      <Header title="Авто-торговля" right={<button className="icon-btn">⚙</button>} />
      <Card>
        <Row label="РЕЖИМ БОТА"><Badge tone="green">ВКЛЮЧЕН</Badge></Row>
        <div className="divider" />
        <small>НАСТРОЙКИ АВТО-ТОРГОВЛИ</small>
        <Row label="Режим стратегии" value={ctx.tradingMode} />
        <Row label="Таймфрейм"><div className="chips">{["M1", "M5", "M15", "H1"].map((item) => <button key={item} className={ctx.selectedTimeframe.toUpperCase() === item ? "active" : ""} onClick={() => update({ selectedTimeframe: item.toLowerCase() })}>{item}</button>)}</div></Row>
        <Row label="Минимальная уверенность AI"><b>75%</b></Row>
        <div className="range"><span style={{ width: "75%" }} /></div>
        <Row label="Риск на сделку"><b>1.5%</b></Row>
        <Row label="Только сильный сигнал"><Toggle checked onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Auto SL/TP"><Toggle checked onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Трейлинг-стоп"><Toggle checked onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Частичное закрытие"><Toggle checked onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Макс. одновременных сделок" value="3" />
        <Row label="Макс. дневной убыток" value="5%" />
        <Button onClick={() => run(ACTIONS.autotuneStatus)}>СОХРАНИТЬ НАСТРОЙКИ</Button>
      </Card>
    </div>
  );
}

function SignalsScreen({ ctx, signal, backendOnline, run }) {
  const direction = signal?.direction || signal?.signal || "WAIT";
  return (
    <div className="screen">
      <Header title="AI сигналы" />
      <Card>
        <Tabs items={["Текущий сигнал", "История"]} active="Текущий сигнал" onSelect={() => run(ACTIONS.getSignal)} />
        <div className="signal-head"><div><p>{ctx.selectedSymbol}</p><h2 className={direction.toLowerCase()}>{direction}</h2></div><button className="round-action">↗</button></div>
        <Row label="Уверенность"><b className="green">{show(signal?.confidence)}%</b></Row>
        <div className="range"><span style={{ width: `${Number(signal?.confidence) || 0}%` }} /></div>
        <Row label="Вход" value={signal?.entry} />
        <Row label="Stop Loss" value={signal?.stopLoss || signal?.sl} tone="red" />
        <Row label="TP1" value={signal?.takeProfit1 || signal?.tp1} tone="green" />
        <Row label="TP2" value={signal?.takeProfit2 || signal?.tp2} tone="green" />
        <Row label="TP3" value={signal?.takeProfit3 || signal?.tp3} tone="green" />
        <div className="ai-box"><strong>Обоснование AI</strong><p>{show(signal?.explanation || signal?.reason, backendOnline ? "n8n не вернул объяснение." : "n8n backend недоступен. Реальные сигналы пока не получены.")}</p></div>
        <Button tone="dark" onClick={() => run(ACTIONS.marketAnalysis)}>ПОДРОБНЫЙ АНАЛИЗ</Button>
      </Card>
    </div>
  );
}

function ChartScreen({ ctx }) {
  return <div className="screen"><Header title="График" right={<div className="toolbar"><button>↗</button><button>▥</button><button>□</button></div>} /><Card><div className="chart-title"><h2>{ctx.selectedSymbol}</h2><div><strong>{noData}</strong><span>Backend не подключён</span></div></div><div className="chips">{["M1", "M5", "M15", "H1"].map((item) => <button key={item} className={ctx.selectedTimeframe.toUpperCase() === item ? "active" : ""}>{item}</button>)}</div><CandleChart /><div className="indicator">RSI (14)<span>{noData}</span></div><div className="indicator">MACD (12,26,9)<span>{noData}</span></div></Card></div>;
}

function DealsScreen({ signal, run }) {
  return <div className="screen"><Header title="Активные сделки" right={<button className="filter">Фильтр⌄</button>} /><Card>{signal?.deals?.length ? signal.deals.map((deal) => <div className="deal" key={deal.id}><Row label={deal.symbol}><Badge tone={deal.side === "SELL" ? "red" : "green"}>{deal.side}</Badge></Row><Row label="Вход" value={deal.entry} /><Row label="Текущая цена" value={deal.current} /><Row label="P&L" value={deal.pnl} tone={Number(deal.pnl) >= 0 ? "green" : "red"} /></div>) : <Empty>Нет реальных сделок. Fake trades не показываются.</Empty>}<Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>ЭКСТРЕННО ОСТАНОВИТЬ ВСЁ</Button></Card></div>;
}

function RiskScreen({ run }) {
  return <div className="screen"><Header title="Risk Manager" right={<button className="icon-btn">☷</button>} /><Card><small>Риск на сделку</small><div className="risk-buttons">{["0.5%", "1%", "1.5%", "2%", "3%"].map((item) => <button key={item} className={item === "1.5%" ? "active" : ""}>{item}</button>)}</div><Row label="Макс. дневной убыток" value="5%" /><Row label="Макс. просадка" value="20%" /><Row label="Макс. одновременных сделок" value="3" /><Row label="Стоп при убытке"><Toggle checked onClick={() => run(ACTIONS.saveSettings)} /></Row><Row label="Пауза после серии убытков" value="2 сделки" /><Row label="Только в плюс"><Toggle checked={false} onClick={() => run(ACTIONS.saveSettings)} /></Row><Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>ЭКСТРЕННО ОСТАНОВИТЬ ВСЁ</Button></Card></div>;
}

function StatsScreen({ run }) {
  return <div className="screen"><Header title="Статистика" /><Card><Tabs items={["День", "Неделя", "Месяц", "Все"]} active="День" onSelect={() => run(ACTIONS.getStats)} /><div className="stat-chart"><MiniChart /></div><div className="mini-grid"><Metric label="Всего сделок" value={noData} /><Metric label="Winrate" value={noData} /><Metric label="Прибыльные" value={noData} /><Metric label="Убыточные" value={noData} /><Metric label="Profit Factor" value={noData} /><Metric label="Средняя прибыль" value={noData} /></div></Card></div>;
}
function HistoryScreen({ run }) { return <div className="screen"><Header title="История сделок" /><Card><Tabs items={["Все", "Прибыльные", "Убыточные"]} active="Все" onSelect={() => run(ACTIONS.getStats)} /><Empty>История появится после ответа n8n backend.</Empty></Card></div>; }
function StrategyScreen({ ctx, update, run }) { return <div className="screen"><Header title="Настройки стратегии" /><Card><Row label="Режим стратегии" value={ctx.tradingMode} /><Row label="Таймфреймы" value="M1, M5" /><Row label="Фильтр тренда" value="EMA 200" /><Row label="Индикаторы" value="RSI, MACD, EMA" /><Row label="Минимальная уверенность" value="75%" /><div className="range"><span style={{ width: "75%" }} /></div><Row label="Торговля по тренду"><Toggle checked onClick={() => run(ACTIONS.saveSettings)} /></Row><Row label="Торговля против тренда"><Toggle checked={false} onClick={() => run(ACTIONS.saveSettings)} /></Row><Button onClick={() => update({ tradingMode: "Scalping" })}>Сохранить настройки</Button></Card></div>; }
function NewsScreen() { return <div className="screen"><Header title="Новости & Календарь" /><Card>{["Индекс деловой активности PMI", "Решение по процентной ставке ФРС", "Пресс-конференция ФРС", "Выступление главы ЕЦБ"].map((item, index) => <div className="event" key={item}><b>{String(12 + index).padStart(2, "0")}:30</b><span>{item}</span><em>Backend</em></div>)}<Row label="Автопауза перед новостями"><Toggle checked onClick={() => {}} /></Row></Card></div>; }
function JournalScreen() { return <div className="screen"><Header title="Журнал активности" /><Card><Tabs items={["Все", "Сделки", "Система", "Ошибки"]} active="Все" onSelect={() => {}} /><Empty>Журнал появится после ответа n8n backend.</Empty></Card></div>; }
function PositionScreen({ run }) { return <div className="screen"><Header title="Управление позицией" /><Card><Row label="XAU/USD"><Badge tone="green">BUY</Badge></Row><Row label="P&L" value={noData} /><div className="mini-grid two"><Button tone="dark" onClick={() => run(ACTIONS.cancelSignal)}>Закрыть 25%</Button><Button tone="dark" onClick={() => run(ACTIONS.cancelSignal)}>Закрыть 50%</Button><Button tone="dark" onClick={() => run(ACTIONS.cancelSignal)}>Закрыть 75%</Button><Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>Закрыть полностью</Button></div><Button tone="dark" onClick={() => run(ACTIONS.saveSettings)}>Перенести SL в безубыток</Button><Button onClick={() => run(ACTIONS.saveSettings)}>Включить трейлинг-стоп</Button></Card></div>; }
function EquityScreen() { return <div className="screen"><Header title="График доходности" /><Card><Tabs items={["День", "Неделя", "Месяц", "Все"]} active="Все" onSelect={() => {}} /><MiniChart /><div className="mini-grid three"><Metric label="Начальный баланс" value={noData} /><Metric label="Текущий баланс" value={noData} /><Metric label="Рост" value={noData} /></div></Card></div>; }
function ModesScreen({ update }) { const modes = ["Скальпинг", "Интрадей", "Агрессивный", "Консервативный", "Только тренд"]; return <div className="screen"><Header title="Режимы стратегии" /><Card>{modes.map((mode) => <button className="strategy-item" key={mode} onClick={() => update({ tradingMode: mode })}><span>◆</span><div><b>{mode}</b><p>Настройка стратегии</p></div></button>)}<Button tone="purple" onClick={() => update({ tradingMode: "Custom" })}>Создать свою стратегию</Button></Card></div>; }
function QualityScreen() { return <div className="screen"><Header title="Качество рынка" right={<button className="icon-btn">×</button>} /><Card className="quality"><div className="gauge"><strong>—</strong><span>/100</span></div><Row label="Волатильность" value="Backend" /><Row label="Тренд" value="Backend" /><Row label="Ликвидность" value="Backend" /><Row label="Рекомендуется торговать" value="Нет данных" /></Card></div>; }
function QuickActions({ run }) { return <div className="screen"><Header title="Быстрые действия" /><div className="action-grid"><Button onClick={() => run(ACTIONS.startPaperTrading)}>Запустить бота</Button><Button tone="red" onClick={() => run(ACTIONS.stop)}>Остановить бота</Button><Button tone="dark" onClick={() => run(ACTIONS.saveSettings)}>Пауза на 30 мин</Button><Button tone="dark" onClick={() => run(ACTIONS.cancelSignal)}>Закрыть все сделки</Button><Button tone="dark" onClick={() => run(ACTIONS.saveSettings)}>Только BUY</Button><Button tone="red" onClick={() => run(ACTIONS.saveSettings)}>Только SELL</Button></div></div>; }

function ProfileScreen({ open, run }) {
  return <div className="screen"><Header title="Профиль" /><Card><div className="profile-row"><div className="avatar">●</div><div><h2>Trader Pro</h2><p>ID: 8300266144</p></div><Badge tone="gold">VIP Pro</Badge></div><Row label="Подписка" value="VIP Pro" tone="green" /><Row label="Статус" value="Активна" tone="green" /><button className="menu-row" onClick={() => run(ACTIONS.getSettings)}>Настройки аккаунта ›</button><button className="menu-row" onClick={() => open("risk")}>Безопасность ›</button><button className="menu-row" onClick={() => open("journal")}>Журнал активности ›</button><Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>Выйти из аккаунта</Button></Card><Card><div className="feature-grid">{FEATURES.map((item) => <button key={item.id} className={item.id === "emergency" ? "danger" : ""} onClick={() => open(item.id)}>{item.title}</button>)}</div></Card></div>;
}
function EmergencyScreen({ run, close }) { return <div className="screen"><Header title="Экстренный стоп" /><Card className="emergency-card"><div className="alert">!</div><strong>Остановить бота и все сделки?</strong><p>Закроются все активные сделки. Остановится поиск новых сделок. Бот перестанет торговать.</p><Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>ОСТАНОВИТЬ ВСЁ</Button><Button tone="dark" onClick={close}>Отмена</Button></Card></div>; }

export default function App() {
  const [telegram] = useState(() => initTelegram());
  const [active, setActive] = useState("home");
  const [feature, setFeature] = useState("");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState("");
  const [context, setContext] = useState(() => ({ selectedSymbol: stored("selectedSymbol", APP_CONFIG.defaults.selectedSymbol), selectedProvider: stored("selectedProvider", APP_CONFIG.defaults.selectedProvider), selectedMarket: stored("selectedMarket", APP_CONFIG.defaults.selectedMarket), selectedTimeframe: stored("selectedTimeframe", APP_CONFIG.defaults.selectedTimeframe), tradingMode: stored("tradingMode", APP_CONFIG.defaults.tradingMode), autoTradingMode: APP_CONFIG.defaults.autoTradingMode }));
  const symbol = useMemo(() => SYMBOLS.find((item) => item.symbol === context.selectedSymbol) || SYMBOLS[0], [context.selectedSymbol]);
  const signal = results.getSignal?.ok ? results.getSignal.data : null;
  const backendOnline = Object.values(results).some((result) => result?.ok);
  const status = { backend: backendOnline };

  const run = async (action, extra = {}, nextContext = context) => {
    const key = actionLabel(action);
    if (CONFIG_ERROR) {
      const blocked = { ok: false, action, error: CONFIG_ERROR, safety: SAFETY_PAYLOAD };
      setResults((current) => ({ ...current, [key]: blocked, [action]: blocked }));
      return blocked;
    }
    setLoading(action);
    triggerHaptic("light");
    const result = await apiAction(action, telegram.user, nextContext, extra, APP_CONFIG.requestTimeoutMs);
    setResults((current) => ({ ...current, [key]: result, [action]: result }));
    setLoading("");
    notifyHaptic(result.ok ? "success" : "error");
    return result;
  };
  const update = (patch) => { const next = { ...context, ...patch }; setContext(next); Object.entries(patch).forEach(([key, value]) => save(key, value)); run(ACTIONS.saveSettings, { uiEvent: "settings_update", ...patch }, next); };
  const nav = (item) => { setFeature(""); setActive(item.id); run(item.action, { uiEvent: "bottom_nav", screen: item.id }); };
  const openFeature = (id) => { setFeature(id); const item = FEATURES.find((entry) => entry.id === id); if (item) run(item.action, { uiEvent: "open_feature", feature: id }); };
  const screen = feature || active;

  return (
    <Shell active={active} onNav={nav} loading={loading}>
      {telegram.warning && <Empty>Открыто вне Telegram. Доступен безопасный preview.</Empty>}
      {screen === "home" && <HomeScreen ctx={context} symbol={symbol} status={status} signal={signal} run={run} go={setActive} />}
      {screen === "auto" && <AutoScreen ctx={context} update={update} run={run} />}
      {screen === "signals" && <SignalsScreen ctx={context} signal={signal} backendOnline={backendOnline} run={run} />}
      {screen === "chart" && <ChartScreen ctx={context} />}
      {screen === "deals" && <DealsScreen signal={signal} run={run} />}
      {screen === "profile" && <ProfileScreen open={openFeature} run={run} />}
      {screen === "risk" && <RiskScreen run={run} />}
      {screen === "stats" && <StatsScreen run={run} />}
      {screen === "history" && <HistoryScreen run={run} />}
      {screen === "strategy" && <StrategyScreen ctx={context} update={update} run={run} />}
      {screen === "news" && <NewsScreen />}
      {screen === "journal" && <JournalScreen />}
      {screen === "position" && <PositionScreen run={run} />}
      {screen === "equity" && <EquityScreen />}
      {screen === "modes" && <ModesScreen update={update} />}
      {screen === "quality" && <QualityScreen />}
      {screen === "quick" && <QuickActions run={run} />}
      {screen === "emergency" && <EmergencyScreen run={run} close={() => setFeature("")} />}
      {["radar", "multi", "plan", "paper", "real", "profit", "balance", "watchlist", "advisor", "diagnostics", "repair", "logs", "settings", "notifications"].includes(screen) && <div className="screen"><Header title={FEATURES.find((item) => item.id === screen)?.title || "Раздел"} /><Card><Empty>Окно готово. Реальные данные появятся после ответа n8n backend.</Empty><Button onClick={() => run(FEATURES.find((item) => item.id === screen)?.action || ACTIONS.status, { feature: screen })}>Запросить данные</Button></Card></div>}
    </Shell>
  );
}
