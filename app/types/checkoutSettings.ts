export interface CheckoutPaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
}

export interface CheckoutPoint {
  label: string;
  query: string;
  lat: number;
  lng: number;
}

export interface CheckoutSettings {
  paymentMethods: CheckoutPaymentMethod[];
  deliveryEnabled: boolean;
  originPoint: CheckoutPoint;
  pickupPoint: CheckoutPoint;
}

