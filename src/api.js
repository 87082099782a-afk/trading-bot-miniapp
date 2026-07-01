import { ACTIONS, getActionUrl, SAFETY_PAYLOAD } from "./config.js";

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
  action,
  telegramUserId: user?.id || "preview-user",
  userId: user?.id || "preview-user",
  username: user?.username || "",
  firstName: user?.firstName || "",
  selectedSymbol: context.selectedSymbol,
  selectedProvider: context.selectedProvider,
  selectedMarket: context.selectedMarket,
  selectedTimeframe: context.selectedTimeframe,
  tradingMode: context.tradingMode,
  autoTradingMode: context.autoTradingMode,
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
      throw new Error("n8n backend недоступен");
    }

    return { ok: true, action, data, safety: SAFETY_PAYLOAD };
  } catch (error) {
    const message = error?.name === "AbortError" ? "n8n backend недоступен" : error?.message || "n8n backend недоступен";
    return { ok: false, action, error: message, data: null, safety: SAFETY_PAYLOAD };
  } finally {
    window.clearTimeout(timeout);
  }
};

export const actionLabel = (action) =>
  Object.entries(ACTIONS).find(([, value]) => value === action)?.[0] || action;
