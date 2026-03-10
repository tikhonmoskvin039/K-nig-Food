export type HapticKind = "light" | "medium" | "success" | "warning" | "error";

type HapticTelegramApi = {
  WebApp?: {
    HapticFeedback?: {
      impactOccurred?: (style: "light" | "medium" | "heavy") => void;
      notificationOccurred?: (
        type: "success" | "warning" | "error",
      ) => void;
    };
  };
};

type HapticWindow = Window & {
  Telegram?: HapticTelegramApi;
};

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 16,
  success: [10, 28, 14],
  warning: [14, 22, 14],
  error: [20, 24, 20],
};

const TOUCH_DEVICE_QUERY = "(hover: none), (pointer: coarse)";

export function isTouchLikeDevice() {
  if (typeof window === "undefined") return false;

  if (navigator.maxTouchPoints > 0) {
    return true;
  }

  try {
    return window.matchMedia(TOUCH_DEVICE_QUERY).matches;
  } catch {
    return false;
  }
}

export function triggerHapticFeedback(kind: HapticKind = "light") {
  if (typeof window === "undefined" || !isTouchLikeDevice()) {
    return;
  }

  try {
    const appWindow = window as HapticWindow;
    const telegramHaptics = appWindow.Telegram?.WebApp?.HapticFeedback;

    if (kind === "success" || kind === "warning" || kind === "error") {
      if (typeof telegramHaptics?.notificationOccurred === "function") {
        telegramHaptics.notificationOccurred(kind);
        return;
      }
    }

    if (typeof telegramHaptics?.impactOccurred === "function") {
      const style = kind === "medium" ? "medium" : kind === "error" ? "heavy" : "light";
      telegramHaptics.impactOccurred(style);
      return;
    }

    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(PATTERNS[kind]);
    }
  } catch {
    // Non-blocking: haptics are optional.
  }
}
