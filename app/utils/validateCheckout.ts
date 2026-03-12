import { CheckoutState } from "../store/slices/checkoutSlice";

export const isCheckoutValid = (checkout: CheckoutState): boolean => {
  const {
    billingForm,
    paymentMethodId,
    fulfillmentMethod,
    deliveryAddress,
    deliveryQuote,
  } = checkout;

  // Validate required fields
  const requiredFields = [
    billingForm.firstName,
    billingForm.lastName,
    billingForm.email,
    paymentMethodId,
  ];

  if (!requiredFields.every((field) => field && field.trim() !== "")) {
    return false;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(billingForm.email)) {
    return false;
  }

  if (fulfillmentMethod !== "pickup" && fulfillmentMethod !== "delivery") {
    return false;
  }

  if (fulfillmentMethod === "delivery") {
    const deliveryRequiredFields = [
      deliveryAddress.city,
      deliveryAddress.street,
      deliveryAddress.house,
    ];

    if (!deliveryRequiredFields.every((field) => field && field.trim() !== "")) {
      return false;
    }

    if (!deliveryQuote || !Number.isFinite(deliveryQuote.amount) || deliveryQuote.amount <= 0) {
      return false;
    }
  }

  return true;
};
