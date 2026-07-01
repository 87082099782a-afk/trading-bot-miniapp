const FALLBACK_USER = {
  id: "preview-user",
  username: "preview",
  firstName: "Preview"
};

export const PREVIEW_WARNING = "Открыто вне Telegram. Доступен только preview режим.";

const getWebApp = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp || null;
};

const safeCall = (callback) => {
  try {
    callback?.();
  } catch {
    // Telegram methods can throw in browser preview mode.
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

  const user = isTelegram
    ? {
        id: String(telegramUser.id),
        username: telegramUser.username || "",
        firstName: telegramUser.first_name || telegramUser.firstName || ""
      }
    : FALLBACK_USER;

  return {
    webApp,
    isTelegram,
    warning: isTelegram ? "" : PREVIEW_WARNING,
    user
  };
};

export const triggerHaptic = (type = "light") => {
  const webApp = getWebApp();
  const impact = webApp?.HapticFeedback?.impactOccurred;

  if (typeof impact === "function") {
    safeCall(() => impact(type));
  }
};

export const notifyHaptic = (type = "success") => {
  const webApp = getWebApp();
  const notification = webApp?.HapticFeedback?.notificationOccurred;

  if (typeof notification === "function") {
    safeCall(() => notification(type));
  }
};
