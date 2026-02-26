export type AdminProductToastType = "success" | "error" | "warning" | "info";

export type AdminProductPendingToast = {
  type: AdminProductToastType;
  message: string;
  description?: string;
  delayMs?: number;
};

const STORAGE_KEY = "admin_product_pending_toast_v1";
const PROPAGATION_WARNING_KEY = "admin_product_propagation_warning_at";
const PROPAGATION_WARNING_COOLDOWN_MS = 5 * 60 * 1000;

export const ADMIN_PROPAGATION_WARNING_TITLE =
  "Публикация изменений может занять несколько минут";
export const ADMIN_PROPAGATION_WARNING_DESCRIPTION =
  "Из-за архитектуры синхронизации через репозиторий обновления в меню появляются не мгновенно.";

export const queueAdminProductToast = (toast: AdminProductPendingToast) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toast));
  } catch {
    // ignore localStorage errors
  }
};

export const popAdminProductToast = (): AdminProductPendingToast | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    localStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as Partial<AdminProductPendingToast>;

    if (!parsed.message || typeof parsed.message !== "string") {
      return null;
    }

    const type: AdminProductToastType =
      parsed.type === "error" ||
      parsed.type === "warning" ||
      parsed.type === "info"
        ? parsed.type
        : "success";

    return {
      type,
      message: parsed.message,
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      delayMs:
        typeof parsed.delayMs === "number" && parsed.delayMs >= 0
          ? parsed.delayMs
          : 0,
    };
  } catch {
    return null;
  }
};

export const shouldShowAdminPropagationWarning = () => {
  if (typeof window === "undefined") return false;

  const now = Date.now();

  try {
    const raw = localStorage.getItem(PROPAGATION_WARNING_KEY);
    const lastShownAt = raw ? Number(raw) : 0;

    if (
      Number.isFinite(lastShownAt) &&
      lastShownAt > 0 &&
      now - lastShownAt < PROPAGATION_WARNING_COOLDOWN_MS
    ) {
      return false;
    }

    localStorage.setItem(PROPAGATION_WARNING_KEY, String(now));
    return true;
  } catch {
    return true;
  }
};
