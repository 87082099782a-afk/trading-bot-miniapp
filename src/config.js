const env = import.meta.env || {};

const parseTimeout = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20000;
};

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
};

export const ENDPOINTS = {
  status: "/telegram-miniapp/status",
  startDemo: "/telegram-miniapp/start-demo",
  stop: "/telegram-miniapp/stop",
  emergencyStop: "/telegram-miniapp/emergency-stop",
  balance: "/telegram-miniapp/balance",
  signal: "/telegram-miniapp/signal",
  statistics: "/telegram-miniapp/statistics",
  analysis: "/telegram-miniapp/analysis",
  strategyTest: "/telegram-miniapp/strategy-test",
  diagnostics: "/telegram-miniapp/diagnostics",
  repair: "/telegram-miniapp/repair",
  logs: "/telegram-miniapp/logs",
  settings: "/telegram-miniapp/settings",
  requestRealMode: "/telegram-miniapp/request-real-mode",
  confirmRealMode: "/telegram-miniapp/confirm-real-mode"
};

export const SAFETY_PAYLOAD = Object.freeze({
  dryRun: true,
  realTrading: false,
  canTrade: false
});

export const APP_CONFIG = {
  appName: env.VITE_APP_NAME || "Trading Bot Control",
  n8nBaseUrl: normalizeBaseUrl(env.VITE_N8N_WEBHOOK_BASE_URL),
  allowedUserId: String(env.VITE_ALLOWED_USER_ID || "8300266144"),
  requestTimeoutMs: parseTimeout(env.VITE_REQUEST_TIMEOUT_MS),
  defaults: {
    symbol: "BTCUSDT",
    timeframe: "5m",
    rsiPeriod: 14,
    candlesLimit: 100,
    maxTradeAmount: "Blocked"
  }
};

export const CONFIG_ERROR = APP_CONFIG.n8nBaseUrl
  ? ""
  : "VITE_N8N_WEBHOOK_BASE_URL is missing. Add it to .env or Vercel environment variables.";

export const getEndpointUrl = (endpoint) => {
  if (!APP_CONFIG.n8nBaseUrl) {
    throw new Error(CONFIG_ERROR);
  }

  return `${APP_CONFIG.n8nBaseUrl}${endpoint}`;
};
