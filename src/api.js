import { getEndpointUrl, SAFETY_PAYLOAD } from "./config.js";

const parseResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const buildPayload = (user, extraPayload = {}) => ({
  ...extraPayload,
  telegramUserId: user?.id || "preview-user",
  userId: user?.id || "preview-user",
  username: user?.username || "",
  firstName: user?.firstName || "",
  ...SAFETY_PAYLOAD
});

export const apiCall = async (endpoint, user, extraPayload = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getEndpointUrl(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildPayload(user, extraPayload)),
      signal: controller.signal
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Request failed with ${response.status}`);
    }

    return {
      ok: true,
      data,
      safety: SAFETY_PAYLOAD
    };
  } catch (error) {
    const message =
      error?.name === "AbortError"
        ? "Request timed out. Check the n8n webhook and network connection."
        : error?.message || "Unknown request error.";

    return {
      ok: false,
      error: message,
      safety: SAFETY_PAYLOAD
    };
  } finally {
    window.clearTimeout(timeout);
  }
};
