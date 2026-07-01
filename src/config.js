const env = import.meta.env || {};

const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");
const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const APP_CONFIG = {
  appName: env.VITE_APP_NAME || "Trading Bot Control",
  ownerUserId: String(env.VITE_ALLOWED_USER_ID || "8300266144"),
  n8nBaseUrl: normalizeBaseUrl(env.VITE_N8N_WEBHOOK_BASE_URL),
  requestTimeoutMs: parseNumber(env.VITE_REQUEST_TIMEOUT_MS, 20000),
  productionUrl: "https://87082099782a-afk.github.io/trading-bot-miniapp/",
  telegramBotUrl: "https://t.me/Bossst11as_bot",
  defaults: {
    selectedSymbol: "XAUUSD",
    selectedProvider: "mt5",
    selectedMarket: "metals",
    selectedTimeframe: "15m",
    tradingMode: "Balanced",
    autoTradingMode: "ANALYSIS_ONLY",
    theme: "Gold Mode"
  }
};

export const ACTION_ENDPOINT = "/telegram-miniapp/action";

export const SAFETY_PAYLOAD = Object.freeze({
  dryRun: true,
  realTrading: false,
  canTrade: false,
  botEnabled: false,
  emergencyStop: false
});

export const SYMBOLS = [
  { symbol: "XAUUSD", market: "metals", provider: "mt5", label: "Gold / USD" },
  { symbol: "XAGUSD", market: "metals", provider: "mt5", label: "Silver / USD" },
  { symbol: "EURUSD", market: "forex", provider: "mt5", label: "Euro / Dollar" },
  { symbol: "GBPUSD", market: "forex", provider: "mt5", label: "Pound / Dollar" },
  { symbol: "USDJPY", market: "forex", provider: "mt5", label: "Dollar / Yen" },
  { symbol: "USDCHF", market: "forex", provider: "mt5", label: "Dollar / Franc" },
  { symbol: "AUDUSD", market: "forex", provider: "mt5", label: "Aussie / Dollar" },
  { symbol: "NZDUSD", market: "forex", provider: "mt5", label: "Kiwi / Dollar" },
  { symbol: "USDCAD", market: "forex", provider: "mt5", label: "Dollar / CAD" },
  { symbol: "EURJPY", market: "forex", provider: "mt5", label: "Euro / Yen" },
  { symbol: "GBPJPY", market: "forex", provider: "mt5", label: "Pound / Yen" },
  { symbol: "EURGBP", market: "forex", provider: "mt5", label: "Euro / Pound" },
  { symbol: "BTCUSDT", market: "crypto", provider: "binance", label: "Bitcoin / USDT" },
  { symbol: "ETHUSDT", market: "crypto", provider: "binance", label: "Ethereum / USDT" },
  { symbol: "SOLUSDT", market: "crypto", provider: "binance", label: "Solana / USDT" },
  { symbol: "BNBUSDT", market: "crypto", provider: "binance", label: "BNB / USDT" },
  { symbol: "XRPUSDT", market: "crypto", provider: "binance", label: "XRP / USDT" },
  { symbol: "TONUSDT", market: "crypto", provider: "binance", label: "TON / USDT" },
  { symbol: "DOGEUSDT", market: "crypto", provider: "binance", label: "Dogecoin / USDT" },
  { symbol: "ADAUSDT", market: "crypto", provider: "binance", label: "Cardano / USDT" },
  { symbol: "AVAXUSDT", market: "crypto", provider: "binance", label: "Avalanche / USDT" },
  { symbol: "LINKUSDT", market: "crypto", provider: "binance", label: "Chainlink / USDT" }
];

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
export const THEMES = ["Dark Pro", "Gold Mode", "Crypto Neon", "Conservative Clean", "Light Pro"];
export const TRADING_MODES = ["Conservative", "Balanced", "Aggressive", "Scalping", "Intraday", "Swing", "Sniper Mode", "Safe Recovery", "Pause Mode"];
export const AUTO_TRADING_MODES = ["OFF", "ANALYSIS_ONLY", "PAPER_TRADING", "LIVE_ARMED", "LIVE", "EMERGENCY_STOP"];

export const ACTIONS = {
  getSymbols: "get_symbols",
  status: "status",
  startAnalysis: "start_analysis",
  startPaperTrading: "start_paper_trading",
  stop: "stop",
  emergencyStop: "emergency_stop",
  getSignal: "get_signal",
  getMultiSignal: "get_multi_signal",
  marketAnalysis: "market_analysis",
  getBalance: "get_balance",
  getStats: "get_stats",
  getLogs: "get_logs",
  getSettings: "get_settings",
  saveSettings: "save_settings",
  calculateProfit: "calculate_profit",
  backtest: "backtest",
  getPairRanking: "get_pair_ranking",
  getOpportunityRadar: "get_opportunity_radar",
  getTradePlan: "get_trade_plan",
  acceptPaperTrade: "accept_paper_trade",
  cancelSignal: "cancel_signal",
  requestRealMode: "request_real_mode",
  confirmRealMode: "confirm_real_mode",
  autotuneStatus: "autotune_status",
  enableSafeRecovery: "enable_safe_recovery",
  diagnostics: "diagnostics",
  selfRepair: "self_repair",
  dailyReport: "daily_report"
};

export const CONFIG_ERROR = APP_CONFIG.n8nBaseUrl
  ? ""
  : "VITE_N8N_WEBHOOK_BASE_URL is missing. Backend is not connected.";

export const getActionUrl = () => {
  if (!APP_CONFIG.n8nBaseUrl) {
    throw new Error(CONFIG_ERROR);
  }

  return `${APP_CONFIG.n8nBaseUrl}${ACTION_ENDPOINT}`;
};
