import checkoutData from "../../configs/checkout.json";

// Define Checkout Settings Structure
interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
}

export interface CheckoutSettings {
  paymentMethods: PaymentMethod[];
}

// Default Fallback
const defaultCheckoutSettings: CheckoutSettings = {
  paymentMethods: [],
};

// Fetch Checkout Settings
// Now using direct import for compatibility with Vercel
export const getCheckoutSettings = (): CheckoutSettings => {
  return checkoutData as CheckoutSettings;
};
