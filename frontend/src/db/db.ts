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

    // Données d'initialisation par défaut pour toute nouvelle installation propre
    this.on('populate', () => {
      this.users.add({
        id: 1,
        name: 'Administrateur',
        email: 'admin@gmail.com',
        password: '$2a$10$fAgXd9fhYdoVDr.2T91Squgf.Niq6LFHHQOTPqWNQIEm1..AzKtuG',
        role: 'admin',
        phone: '+225 07 00 00 00',
        active: true,
        synced: 1,
        created_at: new Date().toISOString()
      });
      this.cash_registers.add({
        id: 1,
        name: 'Caisse Principale',
        code: 'CAISSE-01',
        is_active: true,
        notes: 'Caisse de vente principale',
        synced: 1
      });
      this.settings.bulkAdd([
        { key: 'company_name', value: 'GEST MAGASIN PRO' },
        { key: 'company_phone', value: '+225 07 00 00 00' },
        { key: 'company_email', value: 'admin@gmail.com' },
        { key: 'company_address', value: "Abidjan, Côte d'Ivoire" },
        { key: 'company_nif', value: 'CI-ABJ-2026-B-12345' },
        { key: 'currency', value: 'FCFA' },
        { key: 'tax_rate', value: '0' },
        { key: 'min_stock_alert', value: '10' },
        { key: 'receipt_footer', value: 'Merci de votre visite et à très bientôt !' },
        { key: 'auto_sync', value: 'true' }
      ]);
    });

    // Hooks légers pour déclencher la synchronisation uniquement lors de créations/modifications/suppressions
    this.tables.forEach((table) => {
      if (table.name === 'sync_queue' || table.name === 'settings') return;
      table.hook('creating', (_primKey, obj) => {
        if ((obj as any).synced === 0) {
          scheduleAutoPush();
        }
      });
      table.hook('updating', (modifications) => {
        if ((modifications as any).synced === 0) {
          scheduleAutoPush();
        }
      });
      table.hook('deleting', (primKey) => {
        if (!isPullingFromRemote && typeof primKey === 'number' && primKey > 0) {
          Dexie.ignoreTransaction(async () => {
            try {
              const existing = await db.sync_queue
                .where('tableName')
                .equals(table.name)
                .filter((q) => q.action === 'delete' && q.recordId === Number(primKey))
                .first();

              if (!existing) {
                await db.sync_queue.add({
                  tableName: table.name,
                  action: 'delete',
                  recordId: Number(primKey),
                  payload: '',
                  createdAt: new Date().toISOString(),
                  attempts: 0
                });
              }
              scheduleAutoPush();
            } catch (err) {
              console.warn(`Erreur enregistrement suppression hook ${table.name}:`, err);
            }
          });
        } else {
          scheduleAutoPush();
        }
      });
    });
  }
}

export let isPullingFromRemote = false;
export function setPullingFromRemote(val: boolean) {
  isPullingFromRemote = val;
}

export async function safeDeleteRecord(tableName: string, id: number): Promise<void> {
  if (!id) return;
  const dbTable = (db as any)[tableName];
  if (!dbTable) return;

  await Dexie.ignoreTransaction(async () => {
    try {
      const existing = await db.sync_queue
        .where('tableName')
        .equals(tableName)
        .filter((q) => q.action === 'delete' && q.recordId === Number(id))
        .first();

      if (!existing) {
        await db.sync_queue.add({
          tableName,
          action: 'delete',
          recordId: Number(id),
          payload: '',
          createdAt: new Date().toISOString(),
          attempts: 0
        });
      }
    } catch (_) {}
  });

  await dbTable.delete(id);
  scheduleAutoPush();
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
