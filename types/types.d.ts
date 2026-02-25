declare type DTCartItem = {
  ID: string;
  Slug: string;
  Title: string;
  RegularPrice: string;
  SalePrice: string;
  quantity: number;
  FeatureImageURL: string;
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

  ShortDescription: string;
  LongDescription: string;

  RegularPrice: string;
  SalePrice: string;

  Currency: string;
};

declare type DTCartItem = DTProduct & {
  quantity: number;
};

declare type DTAddress = {
  firstName: string;
  lastName: string;
  email: string;
};

declare type DTOrderData = {
  orderId: string;
  orderDate: string;
  cartItems: DTCartItem[];
  billingForm: Address;
  paymentMethodId: string;
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
};

declare type DTSocialIcon =
  | "SiFacebook"
  | "SiTelegram"
  | "SiX"
  | "SiInstagram"
  | "SiLinkedin"
  | "SiYoutube";
