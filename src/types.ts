export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number; // For calculations of profit margin
  category: string; // matches Category slug
  stock: number;
  unit: string; // e.g. "pcs", "kg", "can", "bottle"
  imageUrl?: string;
  isPopular?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // Lucide icon identity
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number; // discount on this specific item
}

export type PaymentMethod = 'Cash' | 'Card' | 'Mobile Pay' | 'Split';
export type OrderStatus = 'Completed' | 'Refunded' | 'On Hold';

export interface Order {
  id: string;
  orderNumber: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    discountPercent: number;
  }[];
  subtotal: number;
  tax: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  timestamp: string; // ISO String
  customerName?: string;
  customerId?: string;
  customerPointsEarned?: number;
  customerPointsRedeemed?: number;
  tableNumber?: string; // Optional for dine-in settings
  cashierName: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  createdAt: string;
}

export interface SalesByDate {
  date: string;
  sales: number;
  profit: number;
  ordersCount: number;
}

export interface CategorySales {
  category: string;
  amount: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  type: 'sale' | 'inventory' | 'system' | 'refund';
  details?: string;
}

export interface SystemSettings {
  storeName: string;
  storeTelephone: string;
  storeAddress: string;
  taxRatePercent: number;
  lowStockThreshold: number;
  catalogLowStockLimit: number;
  theme?: 'light' | 'dark';
}

