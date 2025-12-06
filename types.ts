
export enum ProductType {
  KARKI = 'Karki',
  MATERIAL = 'Material',
  JOGGERS = 'Joggers',
  JEANS = 'Jeans',
  CHINOS = 'Chinos',
  OTHER = 'Other'
}

export type Role = 'ADMIN' | 'MANAGER' | 'SALESMAN' | 'CUSTOMER' | 'CASHIER';

export type StaffStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'PENDING_DISMISSAL' | 'DISMISSED';

export type OrderFulfillmentStatus = 'NEW' | 'PROCESSING' | 'READY' | 'COMPLETED';

export interface PayrollInfo {
  baseSalary: number;
  allowances: number; // Transport, Feeding, etc.
  deductions: number; // Tax, SSNIT, Loan repayment
  paymentMethod: 'BANK' | 'MOMO' | 'CASH';
  accountNumber: string; // Bank Acc or MoMo Number
  bankName?: string; // e.g. GCB, Ecobank, or MTN MoMo
  lastPaidDate?: string;
}

export interface User {
  id: string;
  name: string;
  username: string; // Phone number for customers, username for staff
  role: Role;
  sessionExpiry?: number; // Timestamp for auto-logout
  
  // HR Fields
  status?: StaffStatus;
  dateHired?: string;
  nominatedBy?: string; // Who initiated the hiring/firing
  justification?: string; // Reason for hiring/firing
  attachment?: string; // Filename of uploaded doc
  
  // Payroll Fields
  payroll?: PayrollInfo;
  
  // Security
  email?: string;
  password?: string; // For simulation only
  isFirstLogin?: boolean;
}

export interface StaffPolicy {
  id: string;
  title: string;
  uploadDate: string;
  size: string;
  type: 'PDF' | 'DOC';
}

export interface StockHistoryEntry {
  id: string;
  date: string;
  type: 'INITIAL' | 'SALE' | 'RETURN' | 'MANUAL_EDIT' | 'BULK_EDIT' | 'RESTOCK' | 'CANCELLATION';
  quantityChange: number; // +5 or -2
  newStockLevel: number;
  note?: string; // e.g. "Transaction ID" or "Stock Correction"
}

export interface Product {
  id: string;
  brand: string;
  type: ProductType;
  color: string;
  model: string;
  size: string;
  costCfa: number;
  exchangeRate: number; // GHS per 1 CFA (or inverted based on user pref, usually 1000 CFA = X GHS)
  costGhsBase: number; // Calculated
  serviceCharge: number; // 5%
  miscCharge: number; // 5%
  profitMargin: number;
  taxRate: number; // Percentage
  sellingPrice: number;
  stockQuantity: number;
  dateAdded: string;
  history: StockHistoryEntry[];
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'MOMO' | 'CARD' | 'UNKNOWN';

export interface Sale {
  id: string;
  transactionId?: string; // Groups multiple items in one checkout
  productId: string;
  productName: string; // Denormalized for easier export
  quantity: number;
  totalPrice: number;
  taxAmount?: number; // Store the tax portion of the total price
  salesman: string;
  customerId: string | null;
  customerName: string;
  date: string; // ISO String
  returnedQuantity?: number; // Track how many items from this specific sale have been returned
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  cashierName?: string;
  
  // Fulfillment
  fulfillmentStatus?: OrderFulfillmentStatus;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalSpent: number;
  lastPurchaseDate: string;
  preferences: string[]; // e.g., ["Joggers", "Size 32"]
}

export type ViewState = 'DASHBOARD' | 'INVENTORY' | 'SALES' | 'CUSTOMERS' | 'PUBLIC_SHOP' | 'CASHIER' | 'STAFF' | 'ORDER_QUEUE' | 'DAILY_SUMMARY';
