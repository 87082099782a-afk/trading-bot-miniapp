import { ACTIONS, APP_CONFIG, getActionUrl, SAFETY_PAYLOAD } from "./config.js";

const BACKEND_ERROR = "n8n backend недоступен";

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const buildSafePayload = (action, user, context, extraPayload = {}) => ({
  telegramUserId: String(user?.id || APP_CONFIG.ownerUserId),
  userId: String(user?.id || APP_CONFIG.ownerUserId),
  username: user?.username || "",
  firstName: user?.firstName || "",
  action,
  provider: context.selectedProvider,
  market: context.selectedMarket,
  symbol: context.selectedSymbol,
  timeframe: context.selectedTimeframe,
  mode: context.tradingMode,
  autoTradingMode: context.autoTradingMode,
  source: "telegram-miniapp",
  ...extraPayload,
  ...SAFETY_PAYLOAD
});

export const apiAction = async (action, user, context, extraPayload = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getActionUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSafePayload(action, user, context, extraPayload)),
      signal: controller.signal
    });

    const data = await parseResponse(response);
    if (!response.ok) {
      throw new Error(BACKEND_ERROR);
    }

    return { ok: true, action, data, safety: SAFETY_PAYLOAD };
  } catch (error) {
    const message = error?.name === "AbortError" ? BACKEND_ERROR : error?.message || BACKEND_ERROR;
    return { ok: false, action, error: message, data: null, safety: SAFETY_PAYLOAD };
  } finally {
    window.clearTimeout(timeout);
  }
};

export const actionLabel = (action) =>
  Object.entries(ACTIONS).find(([, value]) => value === action)?.[0] || action;
