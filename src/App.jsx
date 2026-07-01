import { useMemo, useState } from "react";
import { actionLabel, apiAction } from "./api.js";
import { ACTIONS, APP_CONFIG, CONFIG_ERROR, SAFETY_PAYLOAD, SYMBOLS } from "./config.js";
import { initTelegram, notifyHaptic, triggerHaptic } from "./telegram.js";

const NA = "—";

const NAV = [
  { id: "home", label: "Главная", icon: "⌂", screen: "1", action: ACTIONS.status },
  { id: "auto", label: "Авто-торговля", icon: "↗", screen: "2", action: ACTIONS.autotuneStatus },
  { id: "signals", label: "Сигналы", icon: "≋", screen: "3", action: ACTIONS.getSignal },
  { id: "deals", label: "Сделки", icon: "▣", screen: "5", action: ACTIONS.getStats },
  { id: "profile", label: "Профиль", icon: "○", screen: "18", action: ACTIONS.getSettings }
];

const FEATURE_SCREENS = [
  { id: "chart", title: "График", number: "4", action: ACTIONS.marketAnalysis },
  { id: "risk", title: "Risk Manager", number: "6", action: ACTIONS.getSettings },
  { id: "stats", title: "Статистика", number: "7", action: ACTIONS.getStats },
  { id: "history", title: "История сделок", number: "8", action: ACTIONS.getStats },
  { id: "strategy", title: "Настройки стратегии", number: "9", action: ACTIONS.getSettings },
  { id: "news", title: "Новости & Календарь", number: "10", action: ACTIONS.marketAnalysis },
  { id: "notifications", title: "Уведомления", number: "11", action: ACTIONS.getSettings },
  { id: "journal", title: "Журнал активности", number: "12", action: ACTIONS.getLogs },
  { id: "position", title: "Управление позицией", number: "13", action: ACTIONS.getStats },
  { id: "equity", title: "График доходности", number: "14", action: ACTIONS.getStats },
  { id: "modes", title: "Режимы стратегий", number: "15", action: ACTIONS.getSettings },
  { id: "quality", title: "Качество рынка", number: "16", action: ACTIONS.marketAnalysis },
  { id: "quick", title: "Быстрые действия", number: "17", action: ACTIONS.status },
  { id: "emergency", title: "Экстренный стоп", number: "20", action: ACTIONS.emergencyStop, danger: true }
];

const SCREEN_META = [...NAV, ...FEATURE_SCREENS].reduce((map, item) => {
  map[item.id] = item;
  return map;
}, {});

const QUICK_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSDT", "ETHUSDT"];

const readSaved = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const saveLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Telegram WebView may block storage in strict modes.
  }
};

const value = (input, fallback = NA) => {
  if (input === null || input === undefined || input === "") return fallback;
  return String(input);
};

const safePct = (input) => {
  const number = Number(input);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
};

function AppShell({ active, screen, loading, children, onNav }) {
  const meta = SCREEN_META[screen] || SCREEN_META.home;

  return (
    <main className="phone-shell">
      <div className="phone-frame">
        {loading && <div className="top-loader">Запрос в n8n...</div>}
        <span className="screen-number">{meta.number}</span>
        {children}
        <nav className="bottom-nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={active === item.id ? "active" : ""}
              type="button"
              onClick={() => onNav(item)}
            >
              <i>{item.icon}</i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}

function Header({ title, right, compact = false }) {
  return (
    <header className={compact ? "app-header compact" : "app-header"}>
      <h1>{title}</h1>
      <div className="header-right">{right}</div>
    </header>
  );
}

function Panel({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Button({ children, tone = "green", onClick, disabled = false }) {
  return (
    <button className={`action-btn ${tone}`} disabled={disabled} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function IconButton({ children, onClick }) {
  return (
    <button className="icon-btn" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function Row({ label, value: rowValue, tone = "", children }) {
  return (
    <div className="data-row">
      <span>{label}</span>
      {children || <strong className={tone}>{value(rowValue)}</strong>}
    </div>
  );
}

function Metric({ label, value: metricValue, tone = "" }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong className={tone}>{value(metricValue)}</strong>
    </div>
  );
}

function Toggle({ checked = true, onClick }) {
  return (
    <button className={`toggle ${checked ? "on" : ""}`} type="button" onClick={onClick}>
      <span />
    </button>
  );
}

function Tabs({ items, active, onSelect }) {
  return (
    <div className="tabs">
      {items.map((item) => (
        <button key={item} className={active === item ? "active" : ""} type="button" onClick={() => onSelect?.(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}

function MiniLine() {
  return (
    <div className="mini-line" aria-hidden="true">
      <svg viewBox="0 0 320 96" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#22c55e" stopOpacity="0.38" />
            <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="area" d="M0 78 L22 69 L44 72 L66 54 L88 61 L110 43 L132 47 L154 31 L176 39 L198 26 L220 33 L242 20 L264 28 L286 18 L320 13 L320 96 L0 96 Z" />
        <path className="stroke" d="M0 78 L22 69 L44 72 L66 54 L88 61 L110 43 L132 47 L154 31 L176 39 L198 26 L220 33 L242 20 L264 28 L286 18 L320 13" />
      </svg>
    </div>
  );
}

function CandleChart() {
  return (
    <div className="candle-chart" aria-label="Chart placeholder until backend sends real candles">
      {Array.from({ length: 38 }).map((_, index) => {
        const up = index % 4 !== 0;
        const height = 22 + ((index * 17) % 58);
        const top = 16 + ((index * 11) % 42);
        return <i key={index} className={up ? "up" : "down"} style={{ height: `${height}px`, marginTop: `${top}px` }} />;
      })}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function HomeScreen({ ctx, symbol, signal, backendOnline, mt5Connected, binanceConnected, run, open }) {
  return (
    <div className="screen-body">
      <Header title="AI Auto Trading Bot" right={<IconButton onClick={() => open("notifications")}>♢</IconButton>} />

      <Panel className="hero-panel">
        <div className="asset-title-row">
          <div>
            <b>{ctx.selectedSymbol}</b>
            <small>{symbol.label}</small>
          </div>
          <Badge tone={backendOnline ? "green" : "red"}>{backendOnline ? "Подключено" : "Не подключено"}</Badge>
        </div>
        <div className="gold-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <strong className="big-price">{value(signal?.price)}</strong>
        <span className={backendOnline ? "delta green" : "delta muted"}>
          {backendOnline ? value(signal?.change) : "Backend не подключён"}
        </span>
        <MiniLine />
        <Row label="Баланс" value={signal?.balance} />
        <Row label="Дневная прибыль" value={signal?.dailyProfit} tone="green" />
        <Row label="Общий PNL" value={signal?.pnl} tone="green" />
        <Row label="Статус бота">
          <strong className="red">REAL BLOCKED</strong>
        </Row>
        <Button onClick={() => run(ACTIONS.startPaperTrading)}>↗ Запустить авто-торговлю</Button>
        <Button tone="red" onClick={() => run(ACTIONS.stop)}>⊘ Остановить бота</Button>
        <div className="metrics-row">
          <Metric label="AI сигнал" value={signal?.direction || "WAIT"} tone="green" />
          <Metric label="Активные сделки" value={signal?.activeDeals} />
          <Metric label="Риск сегодня" value={signal?.riskToday} />
        </div>
      </Panel>

      <Panel className="status-list">
        <Row label="n8n backend">
          <strong className={backendOnline ? "green" : "red"}>{backendOnline ? "online" : "недоступен"}</strong>
        </Row>
        <Row label="MT5 provider">
          <strong className={mt5Connected ? "green" : "red"}>{mt5Connected ? "connected" : "не подключён"}</strong>
        </Row>
        <Row label="Binance credentials">
          <strong className={binanceConnected ? "green" : "red"}>{binanceConnected ? "connected" : "не подключены"}</strong>
        </Row>
        <button className="link-row" type="button" onClick={() => open("chart")}>Открыть график ›</button>
      </Panel>
    </div>
  );
}

function AutoScreen({ ctx, run, update }) {
  return (
    <div className="screen-body">
      <Header title="Авто-торговля" right={<IconButton onClick={() => run(ACTIONS.getSettings)}>⚙</IconButton>} />
      <Panel>
        <Row label="Режим бота">
          <Badge tone="green">Paper / analysis</Badge>
        </Row>
        <div className="thin-separator" />
        <span className="section-kicker">Настройки авто-торговли</span>
        <Row label="Режим стратегии" value={ctx.tradingMode} />
        <Row label="Таймфреймы">
          <div className="chip-row">
            {["M1", "M5", "M15", "H1"].map((item) => (
              <button
                key={item}
                className={ctx.selectedTimeframe.toUpperCase() === item ? "active" : ""}
                type="button"
                onClick={() => update({ selectedTimeframe: item.toLowerCase() })}
              >
                {item}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Минимальная уверенность AI" value="75%" />
        <div className="progress"><span style={{ width: "75%" }} /></div>
        <Row label="Риск на сделку" value="1.5%" />
        <Row label="Только сильный сигнал"><Toggle onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Auto SL/TP"><Toggle onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Трейлинг-стоп"><Toggle onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Частичное закрытие"><Toggle onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Макс. одновременных сделок" value="3" />
        <Row label="Макс. дневной убыток" value="5%" />
        <Button onClick={() => run(ACTIONS.saveSettings)}>Сохранить настройки</Button>
      </Panel>
    </div>
  );
}

function SignalsScreen({ ctx, signal, backendOnline, run }) {
  const direction = value(signal?.direction || signal?.signal, "WAIT").toUpperCase();
  const confidence = safePct(signal?.confidence);

  return (
    <div className="screen-body">
      <Header title="AI сигналы" />
      <Panel>
        <Tabs items={["Текущий сигнал", "История"]} active="Текущий сигнал" onSelect={() => run(ACTIONS.getSignal)} />
        {!backendOnline && (
          <EmptyState
            title="n8n backend недоступен"
            text="Реальные сигналы пока не получены. Fake signals не показываются."
          />
        )}
        <div className="signal-card-head">
          <div>
            <span>{ctx.selectedSymbol}</span>
            <strong className={direction === "SELL" ? "red" : direction === "BUY" ? "green" : "gold"}>{direction}</strong>
          </div>
          <button className="round-go" type="button" onClick={() => run(ACTIONS.acceptPaperTrade)}>↗</button>
        </div>
        <Row label="Уверенность"><strong className="green">{confidence || NA}%</strong></Row>
        <div className="progress"><span style={{ width: `${confidence}%` }} /></div>
        <Row label="Вход" value={signal?.entry} />
        <Row label="Stop Loss" value={signal?.stopLoss || signal?.sl} tone="red" />
        <Row label="TP1" value={signal?.takeProfit1 || signal?.tp1} tone="green" />
        <Row label="TP2" value={signal?.takeProfit2 || signal?.tp2} tone="green" />
        <Row label="TP3" value={signal?.takeProfit3 || signal?.tp3} tone="green" />
        <div className="analysis-box">
          <strong>Обоснование AI</strong>
          <p>{value(signal?.explanation || signal?.reason, "Нет реального ответа backend. Подключите n8n для анализа.")}</p>
        </div>
        <Button tone="dark" onClick={() => run(ACTIONS.marketAnalysis)}>Подробный анализ</Button>
      </Panel>
    </div>
  );
}

function ChartScreen({ ctx, run }) {
  return (
    <div className="screen-body">
      <Header title="График" right={<div className="tool-icons"><IconButton>↗</IconButton><IconButton>▥</IconButton><IconButton>□</IconButton></div>} />
      <Panel className="chart-panel">
        <div className="chart-title">
          <b>{ctx.selectedSymbol}</b>
          <div>
            <strong>{NA}</strong>
            <span>Backend не подключён</span>
          </div>
        </div>
        <div className="chip-row">
          {["M1", "M5", "M15", "H1"].map((item) => <button key={item} className={ctx.selectedTimeframe.toUpperCase() === item ? "active" : ""} type="button">{item}</button>)}
        </div>
        <CandleChart />
        <div className="indicator-row"><span>RSI (14)</span><b>{NA}</b></div>
        <div className="indicator-line purple" />
        <div className="indicator-row"><span>MACD (12,26,9)</span><b>{NA}</b></div>
        <div className="indicator-line mixed" />
        <Button tone="dark" onClick={() => run(ACTIONS.marketAnalysis)}>Обновить график</Button>
      </Panel>
    </div>
  );
}

function DealsScreen({ signal, run }) {
  const deals = Array.isArray(signal?.deals) ? signal.deals : [];

  return (
    <div className="screen-body">
      <Header title="Активные сделки" right={<button className="filter-btn" type="button">Фильтр⌄</button>} />
      <Panel>
        {deals.length === 0 && (
          <EmptyState title="Нет реальных сделок" text="Fake trades не отображаются. Данные появятся только из n8n backend." />
        )}
        {deals.map((deal) => (
          <div className="deal-card" key={deal.id || `${deal.symbol}-${deal.entry}`}>
            <Row label={deal.symbol || "SYMBOL"}><Badge tone={deal.side === "SELL" ? "red" : "green"}>{deal.side || "WAIT"}</Badge></Row>
            <Row label="Вход" value={deal.entry} />
            <Row label="Текущая цена" value={deal.current} />
            <Row label="P&L" value={deal.pnl} tone={Number(deal.pnl) >= 0 ? "green" : "red"} />
          </div>
        ))}
        <Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>Экстренно остановить всё</Button>
      </Panel>
    </div>
  );
}

function RiskScreen({ run }) {
  return (
    <div className="screen-body">
      <Header title="Risk Manager" right={<IconButton>☷</IconButton>} />
      <Panel>
        <span className="section-kicker">Риск на сделку</span>
        <div className="risk-grid">
          {["0.5%", "1%", "1.5%", "2%", "3%"].map((item) => <button key={item} className={item === "1.5%" ? "active" : ""} type="button">{item}</button>)}
        </div>
        <Row label="Макс. дневной убыток" value="5%" />
        <Row label="Макс. просадка" value="20%" />
        <Row label="Макс. одновременных сделок" value="3" />
        <Row label="Стоп при убытке"><Toggle onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Пауза после серии убытков" value="2 сделки" />
        <Row label="Только в плюс"><Toggle checked={false} onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>Экстренно остановить всё</Button>
      </Panel>
    </div>
  );
}

function StatsScreen({ run }) {
  return (
    <div className="screen-body">
      <Header title="Статистика" />
      <Panel>
        <Tabs items={["День", "Неделя", "Месяц", "Все"]} active="День" onSelect={() => run(ACTIONS.getStats)} />
        <MiniLine />
        <div className="metrics-grid">
          <Metric label="Всего сделок" value={NA} />
          <Metric label="Winrate" value={NA} />
          <Metric label="Прибыльные" value={NA} />
          <Metric label="Убыточные" value={NA} />
          <Metric label="Profit Factor" value={NA} />
          <Metric label="Средняя прибыль" value={NA} />
        </div>
      </Panel>
    </div>
  );
}

function HistoryScreen({ run }) {
  return (
    <div className="screen-body">
      <Header title="История сделок" />
      <Panel>
        <Tabs items={["Все", "Прибыльные", "Убыточные"]} active="Все" onSelect={() => run(ACTIONS.getStats)} />
        <EmptyState title="История пустая" text="Реальные сделки появятся после ответа n8n. Fake history скрыта." />
      </Panel>
    </div>
  );
}

function StrategyScreen({ ctx, run, update }) {
  return (
    <div className="screen-body">
      <Header title="Настройки стратегии" />
      <Panel>
        <Row label="Режим стратегии" value={ctx.tradingMode} />
        <Row label="Таймфреймы" value="M1, M5" />
        <Row label="Фильтр тренда" value="EMA 200" />
        <Row label="Индикаторы" value="RSI, MACD, EMA" />
        <Row label="Минимальная уверенность" value="75%" />
        <div className="progress"><span style={{ width: "75%" }} /></div>
        <Row label="Торговля по тренду"><Toggle onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Row label="Торговля против тренда"><Toggle checked={false} onClick={() => run(ACTIONS.saveSettings)} /></Row>
        <Button onClick={() => update({ tradingMode: "Scalping" })}>Сохранить настройки</Button>
      </Panel>
    </div>
  );
}

function NewsScreen({ run }) {
  const rows = ["Индекс деловой активности (PMI)", "Решение по процентной ставке ФРС", "Пресс-конференция ФРС", "Выступление главы ЕЦБ"];

  return (
    <div className="screen-body">
      <Header title="Новости & Календарь" right={<IconButton onClick={() => run(ACTIONS.marketAnalysis)}>⟳</IconButton>} />
      <Panel>
        <div className="calendar-strip">
          {["Пн 30", "Вт 1", "Ср 2", "Чт 3", "Пт 4", "Сб 5"].map((day) => <span key={day} className={day.includes("1") ? "active" : ""}>{day}</span>)}
        </div>
        {rows.map((row, index) => (
          <div className="event-row" key={row}>
            <b>{String(12 + index).padStart(2, "0")}:30</b>
            <span>{row}<small>Backend calendar</small></span>
            <em>{NA}</em>
          </div>
        ))}
        <Row label="Автопауза перед новостями"><Toggle onClick={() => run(ACTIONS.saveSettings)} /></Row>
      </Panel>
    </div>
  );
}

function NotificationsScreen({ run }) {
  const items = ["Сделка открыта", "Сделка закрыта", "TP достигнут", "SL сработал", "Новый сигнал", "Высокая волатильность", "Дневной отчёт", "Ошибки и предупреждения"];

  return (
    <div className="screen-body">
      <Header title="Уведомления" />
      <Panel>
        {items.map((item) => <Row key={item} label={item}><Toggle onClick={() => run(ACTIONS.saveSettings)} /></Row>)}
        <span className="section-kicker">Способ уведомлений</span>
        <Row label="Telegram" value="ВКЛ" tone="green" />
        <Row label="Push" value="ВКЛ" tone="green" />
        <Row label="Email" value="ВЫКЛ" />
      </Panel>
    </div>
  );
}

function JournalScreen({ run }) {
  return (
    <div className="screen-body">
      <Header title="Журнал активности" right={<IconButton onClick={() => run(ACTIONS.getLogs)}>☷</IconButton>} />
      <Panel>
        <Tabs items={["Все", "Сделки", "Система", "Ошибки"]} active="Все" onSelect={() => run(ACTIONS.getLogs)} />
        <EmptyState title="Журнал пустой" text="Логи появятся только после ответа n8n backend." />
      </Panel>
    </div>
  );
}

function PositionScreen({ run }) {
  return (
    <div className="screen-body">
      <Header title="Управление позицией" />
      <Panel>
        <Row label="XAU/USD"><Badge tone="green">Paper only</Badge></Row>
        <Row label="P&L" value={NA} />
        <div className="button-grid">
          <Button tone="dark" onClick={() => run(ACTIONS.cancelSignal)}>Закрыть 25%</Button>
          <Button tone="dark" onClick={() => run(ACTIONS.cancelSignal)}>Закрыть 50%</Button>
          <Button tone="dark" onClick={() => run(ACTIONS.cancelSignal)}>Закрыть 75%</Button>
          <Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>Закрыть полностью</Button>
        </div>
        <Button tone="dark" onClick={() => run(ACTIONS.saveSettings)}>Перенести SL в безубыток</Button>
        <Button onClick={() => run(ACTIONS.saveSettings)}>Включить трейлинг-стоп</Button>
      </Panel>
    </div>
  );
}

function EquityScreen({ run }) {
  return (
    <div className="screen-body">
      <Header title="График доходности" />
      <Panel>
        <Tabs items={["День", "Неделя", "Месяц", "Все"]} active="Все" onSelect={() => run(ACTIONS.getStats)} />
        <MiniLine />
        <div className="metrics-row">
          <Metric label="Начальный баланс" value={NA} />
          <Metric label="Текущий баланс" value={NA} />
          <Metric label="Рост" value={NA} />
        </div>
      </Panel>
    </div>
  );
}

function ModesScreen({ update }) {
  const modes = ["Скальпинг", "Интрадей", "Агрессивный", "Консервативный", "Только тренд"];
  return (
    <div className="screen-body">
      <Header title="Режимы стратегий" />
      <Panel>
        {modes.map((mode, index) => (
          <button className="strategy-row" key={mode} type="button" onClick={() => update({ tradingMode: mode })}>
            <i>{index === 0 ? "▰" : index < 3 ? "✦" : "◆"}</i>
            <span><b>{mode}</b><small>{index === 0 ? "Быстрые сделки M1-M5" : "Настраиваемый режим"}</small></span>
          </button>
        ))}
        <Button tone="purple" onClick={() => update({ tradingMode: "Custom" })}>Создать свою стратегию</Button>
      </Panel>
    </div>
  );
}

function QualityScreen({ run }) {
  return (
    <div className="screen-body">
      <Header title="Качество рынка" right={<IconButton>×</IconButton>} />
      <Panel className="quality-panel">
        <div className="gauge"><strong>{NA}</strong><span>/100</span><small>Нет данных</small></div>
        <Row label="Волатильность" value="Backend" />
        <Row label="Тренд" value="Backend" />
        <Row label="Ликвидность" value="Backend" />
        <Row label="Рекомендуется торговать" value="Нет данных" />
        <Button tone="dark" onClick={() => run(ACTIONS.marketAnalysis)}>Запросить анализ</Button>
      </Panel>
    </div>
  );
}

function QuickScreen({ run }) {
  return (
    <div className="screen-body">
      <Header title="Быстрые действия" />
      <div className="quick-actions">
        <Button onClick={() => run(ACTIONS.startPaperTrading)}>Запустить бота</Button>
        <Button tone="red" onClick={() => run(ACTIONS.stop)}>Остановить бота</Button>
        <Button tone="dark" onClick={() => run(ACTIONS.saveSettings)}>Пауза на 30 мин</Button>
        <Button tone="dark" onClick={() => run(ACTIONS.cancelSignal)}>Закрыть все сделки</Button>
        <Button tone="dark" onClick={() => run(ACTIONS.saveSettings)}>Только BUY</Button>
        <Button tone="red" onClick={() => run(ACTIONS.saveSettings)}>Только SELL</Button>
        <Button tone="dark" onClick={() => run(ACTIONS.saveSettings)}>Сброс дневного лимита</Button>
        <Button tone="dark" onClick={() => run(ACTIONS.status)}>Обновить данные</Button>
      </div>
    </div>
  );
}

function ProfileScreen({ open, run }) {
  return (
    <div className="screen-body">
      <Header title="Профиль" />
      <Panel>
        <div className="profile-head">
          <div className="avatar">●</div>
          <div>
            <h2>Trader Pro</h2>
            <p>ID: {APP_CONFIG.ownerUserId}</p>
          </div>
          <Badge tone="gold">VIP Pro</Badge>
        </div>
        <Row label="Подписка" value="VIP Pro" tone="green" />
        <Row label="Статус" value="Production" tone="green" />
        <button className="menu-row" type="button" onClick={() => run(ACTIONS.getSettings)}>Настройки аккаунта ›</button>
        <button className="menu-row" type="button" onClick={() => open("risk")}>Безопасность ›</button>
        <button className="menu-row" type="button" onClick={() => open("journal")}>Журнал активности ›</button>
        <Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>Выйти из аккаунта</Button>
      </Panel>
      <Panel className="feature-panel">
        <div className="feature-grid">
          {FEATURE_SCREENS.map((feature) => (
            <button key={feature.id} className={feature.danger ? "danger" : ""} type="button" onClick={() => open(feature.id)}>
              <b>{feature.number}</b>
              <span>{feature.title}</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function EmergencyScreen({ run, close }) {
  return (
    <div className="screen-body">
      <Header title="Экстренный стоп" />
      <Panel className="emergency-panel">
        <div className="warning-mark">!</div>
        <strong>Остановить бота и все сделки?</strong>
        <p>Реальные сделки заблокированы фронтендом. Команда уйдёт в n8n только с dryRun=true, realTrading=false, canTrade=false.</p>
        <Button tone="red" onClick={() => run(ACTIONS.emergencyStop)}>Остановить всё</Button>
        <Button tone="dark" onClick={close}>Отмена</Button>
      </Panel>
    </div>
  );
}

function MarketsSheet({ ctx, update, close }) {
  const [query, setQuery] = useState("");
  const filtered = SYMBOLS.filter((item) => `${item.symbol} ${item.label}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="sheet">
      <div className="sheet-card">
        <Header title="Выбор рынка" right={<IconButton onClick={close}>×</IconButton>} compact />
        <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск пары" />
        <div className="quick-symbols">
          {QUICK_SYMBOLS.map((symbol) => <button key={symbol} type="button" onClick={() => setQuery(symbol)}>{symbol}</button>)}
        </div>
        <div className="market-list">
          {filtered.slice(0, 12).map((item) => (
            <button
              key={item.symbol}
              className={ctx.selectedSymbol === item.symbol ? "market-row active" : "market-row"}
              type="button"
              onClick={() => {
                update({
                  selectedSymbol: item.symbol,
                  selectedProvider: item.provider,
                  selectedMarket: item.market
                });
                close();
              }}
            >
              <b>{item.symbol}</b>
              <span>{item.label}</span>
              <em>{item.provider}</em>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [telegram] = useState(() => initTelegram());
  const [active, setActive] = useState("home");
  const [screen, setScreen] = useState("home");
  const [showMarkets, setShowMarkets] = useState(false);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState("");
  const [context, setContext] = useState(() => ({
    selectedSymbol: readSaved("selectedSymbol", APP_CONFIG.defaults.selectedSymbol),
    selectedProvider: readSaved("selectedProvider", APP_CONFIG.defaults.selectedProvider),
    selectedMarket: readSaved("selectedMarket", APP_CONFIG.defaults.selectedMarket),
    selectedTimeframe: readSaved("selectedTimeframe", APP_CONFIG.defaults.selectedTimeframe),
    tradingMode: readSaved("tradingMode", APP_CONFIG.defaults.tradingMode),
    autoTradingMode: APP_CONFIG.defaults.autoTradingMode
  }));

  const symbol = useMemo(() => SYMBOLS.find((item) => item.symbol === context.selectedSymbol) || SYMBOLS[0], [context.selectedSymbol]);
  const signal = results.getSignal?.ok ? results.getSignal.data : null;
  const statusData = results.status?.ok ? results.status.data : {};
  const backendOnline = Object.values(results).some((result) => result?.ok === true);
  const mt5Connected = Boolean(statusData?.mt5Connected || statusData?.providers?.mt5?.connected);
  const binanceConnected = Boolean(statusData?.binanceConnected || statusData?.providers?.binance?.connected);

  const run = async (action, extra = {}, nextContext = context) => {
    const key = actionLabel(action);
    if (CONFIG_ERROR) {
      const blocked = { ok: false, action, error: CONFIG_ERROR, data: null, safety: SAFETY_PAYLOAD };
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

  const update = (patch) => {
    const next = { ...context, ...patch };
    setContext(next);
    Object.entries(patch).forEach(([key, item]) => saveLocal(key, item));
    run(ACTIONS.saveSettings, { uiEvent: "settings_update", ...patch }, next);
  };

  const open = (id) => {
    setScreen(id);
    const item = SCREEN_META[id];
    if (item?.action) run(item.action, { uiEvent: "open_screen", screen: id });
  };

  const onNav = (item) => {
    setActive(item.id);
    setScreen(item.id);
    run(item.action, { uiEvent: "bottom_nav", screen: item.id });
  };

  return (
    <AppShell active={active} screen={screen} loading={loading} onNav={onNav}>
      {telegram.warning && (
        <div className="preview-warning">
          Открыто вне Telegram. Preview безопасен, реальные сделки заблокированы.
        </div>
      )}

      {screen === "home" && <HomeScreen ctx={context} symbol={symbol} signal={signal} backendOnline={backendOnline} mt5Connected={mt5Connected} binanceConnected={binanceConnected} run={run} open={open} />}
      {screen === "auto" && <AutoScreen ctx={context} run={run} update={update} />}
      {screen === "signals" && <SignalsScreen ctx={context} signal={signal} backendOnline={backendOnline} run={run} />}
      {screen === "chart" && <ChartScreen ctx={context} run={run} />}
      {screen === "deals" && <DealsScreen signal={signal} run={run} />}
      {screen === "risk" && <RiskScreen run={run} />}
      {screen === "stats" && <StatsScreen run={run} />}
      {screen === "history" && <HistoryScreen run={run} />}
      {screen === "strategy" && <StrategyScreen ctx={context} run={run} update={update} />}
      {screen === "news" && <NewsScreen run={run} />}
      {screen === "notifications" && <NotificationsScreen run={run} />}
      {screen === "journal" && <JournalScreen run={run} />}
      {screen === "position" && <PositionScreen run={run} />}
      {screen === "equity" && <EquityScreen run={run} />}
      {screen === "modes" && <ModesScreen update={update} />}
      {screen === "quality" && <QualityScreen run={run} />}
      {screen === "quick" && <QuickScreen run={run} />}
      {screen === "profile" && <ProfileScreen open={open} run={run} />}
      {screen === "emergency" && <EmergencyScreen run={run} close={() => open("profile")} />}

      <button className="floating-market" type="button" onClick={() => setShowMarkets(true)}>
        {context.selectedSymbol}
      </button>
      {showMarkets && <MarketsSheet ctx={context} update={update} close={() => setShowMarkets(false)} />}
    </AppShell>
  );
}
