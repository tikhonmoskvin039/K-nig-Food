declare type DTCartItem = {
  ID: string;
  Slug: string;
  Title: string;
  RegularPrice: string;
  SalePrice: string;
  quantity: number;
  FeatureImageURL: string;
  Currency: string;
};

declare type DTProduct = {
  ID: string;
  Title: string;
  Slug: string;
  Enabled: boolean;
  CatalogVisible: boolean;

  PortionWeight: number;
  PortionUnit: string;

  ProductCategories: string[];

  FeatureImageURL: string;
  ProductImageGallery: string[];

  IsNewArrival?: boolean;
  NewArrivalOrder?: number;
  IsWeeklyOffer?: boolean;
  WeeklyOfferOrder?: number;

  ShortDescription: string;
  LongDescription: string;

  RegularPrice: string;
  SalePrice: string;

  Currency: string;

  CreatedAt?: string;
  UpdatedAt?: string;
};

declare type DTAddress = {
  firstName: string;
  lastName: string;
  email: string;
};

declare type DTFulfillmentMethod = "pickup" | "delivery";

declare type DTDeliveryAddress = {
  city: string;
  street: string;
  house: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  comment?: string;
};

declare type DTDeliveryQuote = {
  provider: "yandex";
  amount: number;
  currency: "RUB";
  calculatedAt: string;
  reference?: string;
};

declare type DTOrderData = {
  orderId: string;
  orderDate: string;
  cartItems: DTCartItem[];
  billingForm: DTAddress;
  paymentMethodId: string;
  fulfillmentMethod?: DTFulfillmentMethod;
  pickupAddress?: string;
  deliveryAddress?: DTDeliveryAddress | null;
  deliveryQuote?: DTDeliveryQuote | null;
};

// Minimal cart item interface with only required fields for emails
declare type DTMinimalCartItem = {
  ID: string;
  Title: string;
  RegularPrice: string;
  SalePrice: string;
  quantity: number;
};

declare type DTOrderCartItem = DTProduct & {
  quantity: number;
};

declare type DTOrderBody = {
  orderId: string;
  orderDate: string;
  cartItems: DTMinimalCartItem[] | DTOrderCartItem[];
  billingForm: DTAddress;
  paymentMethodId: string;
  fulfillmentMethod?: DTFulfillmentMethod;
  pickupAddress?: string;
  deliveryAddress?: DTDeliveryAddress | null;
  deliveryQuote?: DTDeliveryQuote | null;
};

declare type DTSocialIcon =
  | "SiFacebook"
  | "SiTelegram"
  | "SiX"
  | "SiInstagram"
  | "SiLinkedin"
  | "SiYoutube";
