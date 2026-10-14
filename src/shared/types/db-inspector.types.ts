/**
 * أنواع بيانات مستكشف وفاحص قواعد البيانات SQLite
 */

export interface DatabaseInspectorMeta {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  lastModified: string;
  integrityOk: boolean;
  integrityMessage: string;
  schemaVersion: number | null;
  storeName?: string;
  storePhone?: string;
}

export interface InspectorKPIs {
  totalUsers: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  totalStockQty: number;
  totalSalesCount: number;
  totalRevenueEgp: number;
  totalShifts: number;
  totalAuditLogs: number;
}

export interface InspectorUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
  roleArabic: string;
  isActive: boolean;
  hasPin: boolean;
  createdAt: string;
}

export interface InspectorContact {
  id: number;
  name: string;
  phone: string;
  type: 'عميل' | 'مورد' | 'المحل';
  balanceEgp: number;
  notes?: string;
  address?: string;
  createdAt: string;
}

export interface InspectorSaleItem {
  id: number;
  productName: string;
  variantName?: string;
  qty: number;
  unitPriceEgp: number;
  lineTotalEgp: number;
}

export interface InspectorSale {
  id: number;
  invoiceNo: string;
  createdAt: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
  subtotalEgp: number;
  discountEgp: number;
  taxEgp: number;
  totalEgp: number;
  status: string;
  statusArabic: string;
  itemsCount: number;
  notes?: string;
  items: InspectorSaleItem[];
}

export interface InspectorProduct {
  id: number;
  nameAr: string;
  categoryName?: string;
  brandName?: string;
  barcodes: string[];
  salePriceEgp: number;
  unitCostEgp: number;
  currentStock: number;
  isActive: boolean;
  unit: string;
}

export interface InspectorShift {
  id: number;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingBalanceEgp: number;
  closingBalanceEgp?: number;
  expectedBalanceEgp?: number;
  differenceEgp?: number;
  status: string;
  statusArabic: string;
  notes?: string;
}

export interface InspectorAuditLog {
  id: number;
  userName: string;
  action: string;
  actionArabic: string;
  entityType: string;
  entityId?: number;
  details?: any;
  createdAt: string;
}

export interface DatabaseInspectionResult {
  meta: DatabaseInspectorMeta;
  kpis: InspectorKPIs;
  users: InspectorUser[];
  contacts: InspectorContact[];
  sales: InspectorSale[];
  products: InspectorProduct[];
  shifts: InspectorShift[];
  auditLogs: InspectorAuditLog[];
}

export interface BackupFileInfo {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  createdAt: string;
}
