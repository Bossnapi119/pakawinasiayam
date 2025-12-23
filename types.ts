export type Language = "en" | "ms";

export type BannerAspectRatio = "16:9" | "9:16";

export type OrderType = "dine-in" | "take-away";

export type MenuItemCategory = "Main" | "Set" | "Side" | "Drink";

export type MenuItem = {
  id: string;
  name: string;
  description: string; // Added description
  price: number; // in cents
  category: MenuItemCategory;
  image: string | null; // Added image URL
  isActive: boolean;
};

export type CartItem = MenuItem & { quantity: number };

export type OrderStatus = "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

export type PaymentMethod = "DUITNOW_QR" | "CASH";

export type PaymentMetadata = {
  method?: PaymentMethod;
  receiptImage?: string | null;
  verified?: boolean;
};

export type Order = {
  id: string;
  orderNumber: number;
  createdAt: string;
  orderType: OrderType;
  status: OrderStatus;

  customerName?: string;
  tableNumber?: string;
  specialRequest?: string;

  items: CartItem[];
  totalCents: number;

  payment?: PaymentMetadata;
};

export type SalesRecord = Order;

export type PaymentConfig = {
  bankName: string;
  accountNumber: string;
  beneficiaryName: string;
  qrImage: string | null;
};

export type AboutConfig = {
  description: string;
  location: string;
  operatingHours: string;
  phone: string;
  facebook?: string;
  instagram?: string;
};

export type CustomerProfile = {
  id: string;
  name: string;
  totalOrders: number;
  totalSpentCents: number;
  lastOrderAt?: string;
};

export type VerificationLog = {
  id: string;
  createdAt: string;
  orderId?: string;
  result: "PASS" | "FAIL";
  note?: string;
};

export type TrashItem = {
  id: string;
  type: "menu" | "order" | "customer" | "verification";
  deletedAt: string;
  payload: any;
};
