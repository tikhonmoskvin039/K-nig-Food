// Purpose: Redux slice to manage checkout state (billing form, payment method)
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
}

export type FulfillmentMethod = "pickup" | "delivery";

export interface DeliveryAddressForm {
  city: string;
  street: string;
  house: string;
  apartment: string;
  entrance: string;
  floor: string;
  comment: string;
}

export interface DeliveryQuoteState {
  provider: "yandex";
  amount: number;
  currency: "RUB";
  calculatedAt: string;
  reference?: string;
}

export interface CheckoutState {
  orderId: string;
  orderDate: string;
  billingForm: FormData;
  paymentMethodId: string;
  fulfillmentMethod: FulfillmentMethod;
  pickupAddress: string;
  deliveryAddress: DeliveryAddressForm;
  deliveryAddressConfirmed: boolean;
  deliveryQuote: DeliveryQuoteState | null;
}

const initialForm: FormData = {
  firstName: "",
  lastName: "",
  email: "",
};

const initialDeliveryAddress: DeliveryAddressForm = {
  city: "",
  street: "",
  house: "",
  apartment: "",
  entrance: "",
  floor: "",
  comment: "",
};

const initialState: CheckoutState = {
  orderId: "",
  orderDate: "",
  billingForm: initialForm,
  paymentMethodId: "",
  fulfillmentMethod: "pickup",
  pickupAddress: "Калининград, Красная 139Б",
  deliveryAddress: initialDeliveryAddress,
  deliveryAddressConfirmed: true,
  deliveryQuote: null,
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setOrderInfo(state, action: PayloadAction<{ id: string; date: string }>) {
      state.orderId = action.payload.id;
      state.orderDate = action.payload.date;
    },
    setBillingForm(state, action: PayloadAction<Partial<FormData>>) {
      state.billingForm = { ...state.billingForm, ...action.payload };
    },
    setPaymentMethod(state, action: PayloadAction<string>) {
      state.paymentMethodId = action.payload;
    },
    setFulfillmentMethod(state, action: PayloadAction<FulfillmentMethod>) {
      state.fulfillmentMethod = action.payload;
      if (action.payload === "pickup") {
        state.deliveryQuote = null;
      }
    },
    setPickupAddress(state, action: PayloadAction<string>) {
      state.pickupAddress = action.payload;
    },
    setDeliveryAddress(state, action: PayloadAction<Partial<DeliveryAddressForm>>) {
      state.deliveryAddress = { ...state.deliveryAddress, ...action.payload };
    },
    setDeliveryAddressConfirmed(state, action: PayloadAction<boolean>) {
      state.deliveryAddressConfirmed = action.payload;
    },
    setDeliveryQuote(state, action: PayloadAction<DeliveryQuoteState | null>) {
      state.deliveryQuote = action.payload;
    },
    clearDeliveryQuote(state) {
      state.deliveryQuote = null;
    },
  },
});

export const {
  setOrderInfo,
  setBillingForm,
  setPaymentMethod,
  setFulfillmentMethod,
  setPickupAddress,
  setDeliveryAddress,
  setDeliveryAddressConfirmed,
  setDeliveryQuote,
  clearDeliveryQuote,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
