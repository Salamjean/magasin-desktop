import Dexie, { Table } from 'dexie';

export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'caissier' | 'magasinier' | 'livreur';
  phone?: string;
  address?: string;
  avatar?: string;
  active: boolean;
  synced: number;
  created_at?: string;
}

export interface Category {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  synced: number;
}

export interface Product {
  id?: number;
  name: string;
  reference: string;
  barcode: string;
  category_id?: number;
  supplier_id?: number;
  user_id?: number;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  image?: string;
  is_active: boolean;
  synced: number;
  created_at?: string;
}

export interface Supplier {
  id?: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  notes?: string;
  synced: number;
}

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  current_debt: number;
  loyalty_points: number;
  synced: number;
}

export interface CashRegister {
  id?: number;
  name: string;
  code: string;
  is_active: boolean;
  notes?: string;
  synced: number;
}

export interface CashSession {
  id?: number;
  cash_register_id: number;
  user_id: number;
  opening_amount: number;
  closing_amount?: number;
  expected_closing_amount?: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  notes?: string;
  synced: number;
}

export interface CashMovement {
  id?: number;
  cash_session_id: number;
  type: 'deposit' | 'withdrawal';
  amount: number;
  reason: string;
  created_at: string;
  synced: number;
}

export interface Sale {
  id?: number;
  invoice_number: string;
  user_id: number;
  customer_id?: number;
  cash_session_id?: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: 'cash' | 'card' | 'wave' | 'om' | 'credit';
  payment_status: 'paid' | 'partial' | 'pending';
  notes?: string;
  created_at: string;
  synced: number;
}

export interface SaleItem {
  id?: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  synced: number;
}

export interface StockMovement {
  id?: number;
  product_id: number;
  type: 'in' | 'out' | 'adjustment' | 'return';
  quantity: number;
  reference: string;
  reason: string;
  user_id: number;
  created_at: string;
  synced: number;
}

export interface Delivery {
  id?: number;
  sale_id?: number;
  customer_id?: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  amount_to_collect?: number;
  livreur_id?: number;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  otp_code: string;
  notes?: string;
  items_json?: string;
  delivery_type?: 'free' | 'sale';
  created_at: string;
  delivered_at?: string;
  synced: number;
}

export interface Expense {
  id?: number;
  title: string;
  category: string;
  amount: number;
  payment_method: string;
  notes?: string;
  user_id: number;
  date: string;
  synced: number;
}

export interface Inventory {
  id?: number;
  reference: string;
  status: 'draft' | 'validated' | 'cancelled';
  user_id: number;
  date: string;
  notes?: string;
  synced: number;
}

export interface InventoryItem {
  id?: number;
  inventory_id: number;
  product_id: number;
  theoretical_quantity: number;
  real_quantity: number;
  difference: number;
  cost_variance: number;
  reason?: string;
  synced: number;
}

export interface Purchase {
  id?: number;
  reference: string;
  supplier_id: number;
  total_amount: number;
  status: 'ordered' | 'received' | 'partial' | 'cancelled';
  received_at?: string;
  received_by_user_id?: number;
  received_by?: string;
  user_id: number;
  notes?: string;
  created_at: string;
  synced: number;
}

export interface PurchaseItem {
  id?: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  received_quantity?: number;
  unit_price: number;
  subtotal: number;
  synced: number;
}

export interface Setting {
  key: string;
  value: string;
}

export interface SyncQueueItem {
  id?: number;
  tableName: string;
  action: 'insert' | 'update' | 'delete';
  recordId: number;
  payload: string;
  createdAt: string;
  attempts: number;
}

export class AppDatabase extends Dexie {
  users!: Table<User, number>;
  categories!: Table<Category, number>;
  products!: Table<Product, number>;
  suppliers!: Table<Supplier, number>;
  customers!: Table<Customer, number>;
  cash_registers!: Table<CashRegister, number>;
  cash_sessions!: Table<CashSession, number>;
  cash_movements!: Table<CashMovement, number>;
  sales!: Table<Sale, number>;
  sale_items!: Table<SaleItem, number>;
  stock_movements!: Table<StockMovement, number>;
  deliveries!: Table<Delivery, number>;
  expenses!: Table<Expense, number>;
  inventories!: Table<Inventory, number>;
  inventory_items!: Table<InventoryItem, number>;
  purchases!: Table<Purchase, number>;
  purchase_items!: Table<PurchaseItem, number>;
  settings!: Table<Setting, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('GestMagasinDB');
    this.version(1).stores({
      users: '++id, email, role, active, synced',
      categories: '++id, name, synced',
      products: '++id, reference, barcode, category_id, supplier_id, user_id, is_active, synced',
      suppliers: '++id, name, phone, synced',
      customers: '++id, name, phone, synced',
      cash_registers: '++id, code, is_active, synced',
      cash_sessions: '++id, cash_register_id, user_id, status, opened_at, synced',
      cash_movements: '++id, cash_session_id, type, created_at, synced',
      sales: '++id, invoice_number, user_id, customer_id, cash_session_id, payment_method, payment_status, created_at, synced',
      sale_items: '++id, sale_id, product_id, synced',
      stock_movements: '++id, product_id, type, user_id, created_at, synced',
      deliveries: '++id, sale_id, livreur_id, status, otp_code, synced',
      expenses: '++id, category, user_id, date, synced',
      inventories: '++id, reference, status, user_id, date, synced',
      inventory_items: '++id, inventory_id, product_id, synced',
      purchases: '++id, reference, supplier_id, status, user_id, created_at, synced',
      purchase_items: '++id, purchase_id, product_id, synced',
      settings: 'key',
      sync_queue: '++id, tableName, action, recordId, createdAt'
    });

    // Enregistrement des hooks universels sur toutes les tables pour la synchronisation automatique
    this.tables.forEach((table) => {
      if (table.name === 'sync_queue') return;
      table.hook('creating', (primKey, obj, trans) => {
        if ((obj as any).synced === undefined) {
          (obj as any).synced = 0;
        }
        scheduleAutoPush();
      });
      table.hook('updating', (modifications, primKey, obj, trans) => {
        if ((modifications as any).synced === undefined) {
          (modifications as any).synced = 0;
        }
        scheduleAutoPush();
      });
      table.hook('deleting', (primKey, obj, trans) => {
        scheduleAutoPush();
      });
    });
  }
}

let syncTimer: any = null;
export function scheduleAutoPush() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const { syncService } = await import('./syncService');
      await syncService.pushToRemote();
    } catch (_) {}
  }, 1000);
}

export const db = new AppDatabase();
