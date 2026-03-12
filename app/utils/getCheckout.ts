import { getCheckoutSettingsState } from "../lib/checkoutSettingsRepository";
import type { CheckoutSettings } from "../types/checkoutSettings";

export type { CheckoutSettings };

export const getCheckoutSettings = async (): Promise<CheckoutSettings> => {
  return getCheckoutSettingsState();
};
