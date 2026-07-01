export const PREVIEW_WARNING = "Открыто вне Telegram. Доступен preview режим без реальных сделок.";

const FALLBACK_USER = {
  id: "preview-user",
  username: "preview",
  firstName: "Preview"
};

const getWebApp = () => (typeof window === "undefined" ? null : window.Telegram?.WebApp || null);

const safeCall = (callback) => {
  try {
    callback?.();
  } catch {
    // Telegram methods can throw outside the Telegram client.
  }
};

export const initTelegram = () => {
  const webApp = getWebApp();
  const telegramUser = webApp?.initDataUnsafe?.user || null;
  const isTelegram = Boolean(webApp && telegramUser?.id);

  if (webApp) {
    safeCall(() => webApp.ready());
    safeCall(() => webApp.expand());
  }

  return {
    webApp,
    isTelegram,
    warning: isTelegram ? "" : PREVIEW_WARNING,
    user: isTelegram
      ? {
          id: String(telegramUser.id),
          username: telegramUser.username || "",
          firstName: telegramUser.first_name || telegramUser.firstName || ""
        }
      : FALLBACK_USER
  };
};

export const triggerHaptic = (type = "light") => {
  const impact = getWebApp()?.HapticFeedback?.impactOccurred;
  if (typeof impact === "function") safeCall(() => impact(type));
};

export const notifyHaptic = (type = "success") => {
  const notification = getWebApp()?.HapticFeedback?.notificationOccurred;
  if (typeof notification === "function") safeCall(() => notification(type));
};
