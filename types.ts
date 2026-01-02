
// Versiyonu buraya sabitliyoruz. React derlendiğinde bu string kodun parçası olur.
export const APP_VERSION = 'v8';

export enum UserRole {
  ADMIN = 'ADMIN',
  PERSONNEL = 'PERSONNEL'
}

export enum PaymentStatus {
  PAID = 'ODENDI',
  PARTIAL = 'KISMI_ODENDI',
  UNPAID = 'VERESIYE'
}

export enum SaleStatus {
  ACTIVE = 'AKTIF',
  RETURNED = 'IADE',
  CANCELLED = 'IPTAL'
}

export enum TransactionType {
  COLLECTION = 'TAHSILAT',
  PAYMENT = 'ODEME'
}

export enum CustomerType {
  INDIVIDUAL = 'Bireysel Müşteri',
  CORPORATE = 'Kurumsal Müşteri'
}

export enum TaskPriority {
  VERY_HIGH = 'VERY_HIGH',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  VERY_LOW = 'VERY_LOW'
}

export type BaseProductName = string;

export interface AppSettings {
  productCategories: string[];
  variantOptions: string[];
  customerTypes: string[];
  salesChannels: string[];
  deliveryTypes: string[];
  shippingCompanies: string[];
}

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface Product {
  id: string;
  baseName: BaseProductName;
  variantName: string;
  description?: string;
  sellPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive?: boolean;
  isArchived?: boolean; // NEW: Soft delete için
  createdBy?: string;
}

export interface Customer {
  id: string;
  name: string;
  type: string;
  salesChannel: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  description?: string;
  currentBalance: number;
  createdBy?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  totalPrice: number;
}

export interface ReturnItem {
  productId: string;
  quantity: number;
  condition: 'RESELLABLE' | 'DEFECTIVE'; // NEW: Sağlam veya Bozuk
}

export interface ReturnDetails {
  date: string;
  reason: string;
  returnShippingCompany?: string;
  returnTrackingNumber?: string;
  refundAmount: number;
  refundShippingCost?: boolean; // NEW: Kargo iade edilsin mi?
  processedBy: string;
  returnedItems?: ReturnItem[]; 
  refundStatus: 'PENDING' | 'COMPLETED'; 
  refundMethod?: 'CASH' | 'CREDIT_CARD' | 'IBAN' | 'WALLET';
  refundDescription?: string;
  refundDate?: string;
}

export interface Sale {
  id: string;
  customerId: string | null;
  customerName: string;
  items: SaleItem[];
  totalAmount: number; 
  shippingCost?: number; 
  shippingPayer?: 'CUSTOMER' | 'COMPANY' | 'NONE'; // NEW: Kargo ödeyicisi (Hediye için)
  paidAmount?: number;
  discountAmount?: number;
  date: string;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  type?: 'SALE' | 'GIFT'; 
  returnDetails?: ReturnDetails;
  dueDate?: string;
  personnelName: string;
  deliveryStatus?: 'BEKLIYOR' | 'TESLIM_EDILDI';
  deliveryType?: string;
  shippingCompany?: string;
  trackingNumber?: string;
  shippingUpdatedBy?: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
  personnelName: string;
  saleId?: string; // NEW: Hangi satışa ait olduğu (Opsiyonel, genel tahsilat için boş)
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string; // User ID
  assignedToName: string;
  createdBy: string;
  dueDate: string;
  priority: TaskPriority;
  status: 'PENDING' | 'COMPLETED' | 'WAITING_APPROVAL';
  adminNote?: string; // NEW: Admin red nedeni
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export interface RawMaterialCost {
  id: string;
  name: string;
  unitPrice: number;
  usagePercent: number; 
}

export interface OtherCost {
  id: string;
  name: string; 
  unitCost: number; 
}

export interface ProductCost {
  productId: string;
  productNetWeight: number; 
  rawMaterials: RawMaterialCost[];
  otherCosts: OtherCost[];
  totalCost: number;
  lastUpdated: string;
}

export interface ActivityLog {
  id: string;
  date: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'FINANCIAL';
  entity: 'PRODUCT' | 'CUSTOMER' | 'SALE' | 'RETURN' | 'COLLECTION' | 'SETTINGS' | 'TASK';
  description: string;
  metadata?: any;
}
