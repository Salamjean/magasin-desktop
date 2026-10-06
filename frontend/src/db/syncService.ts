import { db } from './db';

const API_BASE_URL = 'http://localhost:5000/api';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  unsyncedCount: number;
  message: string;
}

class SyncService {
  private isSyncing = false;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private currentStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    unsyncedCount: 0,
    message: 'Prêt'
  };

  constructor() {
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Synchronisation automatique périodique toutes les 5 secondes pour une réactivité immédiate
    setInterval(() => {
      this.checkStatusAndAutoSync();
    }, 5000);

    // Première synchronisation immédiate au démarrage
    setTimeout(() => {
      this.checkStatusAndAutoSync();
    }, 1000);
  }

  public subscribe(callback: (status: SyncStatus) => void) {
    this.listeners.push(callback);
    callback(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb({ ...this.currentStatus }));
  }

  private handleNetworkChange(online: boolean) {
    this.currentStatus.isOnline = online;
    if (online) {
      this.currentStatus.message = 'Connexion rétablie - Synchronisation en cours...';
      this.syncNow();
    } else {
      this.currentStatus.message = 'Mode Hors-ligne (Modifications enregistrées localement)';
      this.notify();
    }
  }

  public async getUnsyncedCount(): Promise<number> {
    try {
      const [
        users, categories, products, suppliers, customers,
        sales, saleItems, stockMoves, deliveries, expenses,
        purchases, cashRegisters, cashSessions, cashMovements
      ] = await Promise.all([
        db.users.where('synced').equals(0).count(),
        db.categories.where('synced').equals(0).count(),
        db.products.where('synced').equals(0).count(),
        db.suppliers.where('synced').equals(0).count(),
        db.customers.where('synced').equals(0).count(),
        db.sales.where('synced').equals(0).count(),
        db.sale_items.where('synced').equals(0).count(),
        db.stock_movements.where('synced').equals(0).count(),
        db.deliveries.where('synced').equals(0).count(),
        db.expenses.where('synced').equals(0).count(),
        db.purchases.where('synced').equals(0).count(),
        db.cash_registers.where('synced').equals(0).count(),
        db.cash_sessions.where('synced').equals(0).count(),
        db.cash_movements.where('synced').equals(0).count(),
      ]);

      return (
        users + categories + products + suppliers + customers +
        sales + saleItems + stockMoves + deliveries + expenses +
        purchases + cashRegisters + cashSessions + cashMovements
      );
    } catch {
      return 0;
    }
  }

  public async checkStatusAndAutoSync() {
    const unsynced = await this.getUnsyncedCount();
    this.currentStatus.unsyncedCount = unsynced;

    if (!navigator.onLine) {
      this.currentStatus.isOnline = false;
      this.currentStatus.message = 'Hors-ligne';
      this.notify();
      return;
    }

    // Vérification rapide avec timeout de 2.5s pour ne jamais bloquer
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const healthRes = await fetch(`${API_BASE_URL}/sync/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const healthData = await healthRes.json();
      this.currentStatus.isOnline = healthData.success === true;
      if (this.currentStatus.isOnline) {
        this.currentStatus.message = 'En ligne';
      }
    } catch {
      this.currentStatus.isOnline = false;
      this.currentStatus.message = 'Serveur distant inaccessible (Mode local)';
      this.notify();
      return;
    }

    if (this.currentStatus.isOnline && !this.isSyncing) {
      await this.syncNow();
    } else {
      this.notify();
    }
  }

  // PULL : Récupérer toutes les données MySQL et mettre à jour la base IndexedDB locale
  public async pullFromRemote(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/sync/pull`);
      if (!res.ok) return false;
      const json = await res.json();
      if (!json.success || !json.data) return false;

      const data = json.data;

      // 1. Settings
      if (data.settings && Array.isArray(data.settings) && data.settings.length > 0) {
        await db.settings.bulkPut(
          data.settings.map((s: any) => ({ key: s.key, value: String(s.value || '') }))
        );
        window.dispatchEvent(new Event('gestmag:settings_updated'));
      }

      // 2. Users
      if (data.users && Array.isArray(data.users) && data.users.length > 0) {
        await db.users.bulkPut(
          data.users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            password: u.password,
            role: u.role,
            phone: u.phone || undefined,
            avatar: u.avatar || undefined,
            active: u.active === 1 || u.active === true || u.active === '1',
            synced: 1,
            created_at: u.created_at
          }))
        );
      }

      // 3. Cash Registers
      if (data.cash_registers && Array.isArray(data.cash_registers)) {
        const remoteIds = new Set(data.cash_registers.map((cr: any) => Number(cr.id)));
        const localRegs = await db.cash_registers.toArray();
        const toDelete = localRegs.filter((lr) => lr.id && lr.synced === 1 && !remoteIds.has(lr.id));
        if (toDelete.length > 0) {
          await db.cash_registers.bulkDelete(toDelete.map((lr) => lr.id!));
        }

        if (data.cash_registers.length > 0) {
          await db.cash_registers.bulkPut(
            data.cash_registers.map((cr: any) => ({
              id: cr.id,
              name: cr.name,
              code: cr.code,
              is_active: cr.is_active === 1 || cr.is_active === true || cr.is_active === '1',
              notes: cr.notes || undefined,
              synced: 1
            }))
          );
        }
      }

      // 4. Categories
      if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
        await db.categories.bulkPut(
          data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description || undefined,
            icon: c.icon || 'Package',
            color: c.color || '#0284c7',
            synced: 1
          }))
        );
      }

      // 5. Suppliers
      if (data.suppliers && Array.isArray(data.suppliers) && data.suppliers.length > 0) {
        await db.suppliers.bulkPut(
          data.suppliers.map((s: any) => ({
            id: s.id,
            name: s.name,
            contact_name: s.contact_name || undefined,
            email: s.email || undefined,
            phone: s.phone || undefined,
            address: s.address || undefined,
            tax_number: s.tax_number || undefined,
            notes: s.notes || undefined,
            synced: 1
          }))
        );
      }

      // 6. Customers
      if (data.customers && Array.isArray(data.customers) && data.customers.length > 0) {
        await db.customers.bulkPut(
          data.customers.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || undefined,
            email: c.email || undefined,
            address: c.address || undefined,
            credit_limit: Number(c.credit_limit || 0),
            current_debt: Number(c.current_debt || 0),
            loyalty_points: Number(c.loyalty_points || 0),
            synced: 1
          }))
        );
      }

      // 7. Products
      if (data.products && Array.isArray(data.products) && data.products.length > 0) {
        await db.products.bulkPut(
          data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            reference: p.reference,
            barcode: p.barcode,
            category_id: p.category_id || undefined,
            supplier_id: p.supplier_id || undefined,
            user_id: p.user_id || undefined,
            purchase_price: Number(p.purchase_price || 0),
            selling_price: Number(p.selling_price || 0),
            stock_quantity: Number(p.stock_quantity || 0),
            min_stock: Number(p.min_stock || 5),
            unit: p.unit || 'pièce',
            image: p.image || undefined,
            is_active: p.is_active === 1 || p.is_active === true || p.is_active === '1',
            synced: 1,
            created_at: p.created_at
          }))
        );
      }

      // 8. Cash Sessions
      if (data.cash_sessions && Array.isArray(data.cash_sessions) && data.cash_sessions.length > 0) {
        await db.cash_sessions.bulkPut(
          data.cash_sessions.map((cs: any) => ({
            id: cs.id,
            user_id: cs.user_id,
            cash_register_id: cs.cash_register_id,
            opening_amount: Number(cs.opening_amount || 0),
            closing_amount: cs.closing_amount !== null && cs.closing_amount !== undefined ? Number(cs.closing_amount) : undefined,
            expected_closing_amount: cs.expected_closing_amount !== null && cs.expected_closing_amount !== undefined ? Number(cs.expected_closing_amount) : undefined,
            status: cs.status || 'open',
            opened_at: cs.opened_at,
            closed_at: cs.closed_at || undefined,
            notes: cs.notes || undefined,
            synced: 1
          }))
        );
      }

      // 9. Cash Movements
      if (data.cash_movements && Array.isArray(data.cash_movements) && data.cash_movements.length > 0) {
        await db.cash_movements.bulkPut(
          data.cash_movements.map((cm: any) => ({
            id: cm.id,
            cash_session_id: cm.cash_session_id,
            type: cm.type,
            amount: Number(cm.amount || 0),
            reason: cm.reason || '',
            created_at: cm.created_at,
            synced: 1
          }))
        );
      }

      // 10. Sales
      if (data.sales && Array.isArray(data.sales) && data.sales.length > 0) {
        const unsyncedSales = await db.sales.where('synced').equals(0).toArray();
        const unsyncedSaleIds = new Set(unsyncedSales.map((s) => s.id));

        const salesToPut = data.sales
          .filter((s: any) => !unsyncedSaleIds.has(s.id))
          .map((s: any) => ({
            id: s.id,
            invoice_number: s.invoice_number,
            user_id: s.user_id,
            customer_id: s.customer_id || undefined,
            cash_session_id: s.cash_session_id || undefined,
            subtotal: Number(s.subtotal || s.total_amount || 0),
            discount_amount: Number(s.discount_amount || 0),
            tax_amount: Number(s.tax_amount || 0),
            total_amount: Number(s.total_amount || 0),
            paid_amount: Number(s.paid_amount || 0),
            change_amount: Number(s.change_amount || 0),
            payment_method: s.payment_method || 'cash',
            payment_status: s.payment_status || 'paid',
            notes: s.notes || undefined,
            created_at: s.created_at,
            synced: 1
          }));

        if (salesToPut.length > 0) {
          await db.sales.bulkPut(salesToPut);
        }
      }

      // 11. Sale Items
      if (data.sale_items && Array.isArray(data.sale_items) && data.sale_items.length > 0) {
        await db.sale_items.bulkPut(
          data.sale_items.map((item: any) => ({
            id: item.id,
            sale_id: item.sale_id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: Number(item.quantity || 1),
            unit_price: Number(item.unit_price || 0),
            subtotal: Number(item.subtotal || item.total_price || (item.quantity * item.unit_price) || 0),
            synced: 1
          }))
        );
      }

      // 12. Stock Movements
      if (data.stock_movements && Array.isArray(data.stock_movements) && data.stock_movements.length > 0) {
        await db.stock_movements.bulkPut(
          data.stock_movements.map((sm: any) => ({
            id: sm.id,
            product_id: sm.product_id,
            type: sm.type || 'adjustment',
            quantity: Number(sm.quantity || 0),
            reference: sm.reference || `MVT-${sm.id}`,
            reason: sm.reason || 'Ajustement',
            user_id: sm.user_id || 1,
            created_at: sm.created_at,
            synced: 1
          }))
        );
      }

      // 13. Expenses
      if (data.expenses && Array.isArray(data.expenses) && data.expenses.length > 0) {
        await db.expenses.bulkPut(
          data.expenses.map((e: any) => ({
            id: e.id,
            user_id: e.user_id,
            title: e.title,
            amount: Number(e.amount || 0),
            category: e.category || 'Général',
            payment_method: e.payment_method || 'cash',
            date: e.date,
            notes: e.notes || undefined,
            receipt_image: e.receipt_image || undefined,
            synced: 1
          }))
        );
      }

      // 14. Purchases & Purchase Items
      if (data.purchases && Array.isArray(data.purchases) && data.purchases.length > 0) {
        await db.purchases.bulkPut(
          data.purchases.map((pur: any) => ({
            id: pur.id,
            reference: pur.reference || `ACH-${pur.id}`,
            supplier_id: pur.supplier_id,
            user_id: pur.user_id || 1,
            total_amount: Number(pur.total_amount || 0),
            status: pur.status || 'pending',
            created_at: pur.created_at || pur.order_date,
            delivery_date: pur.delivery_date || undefined,
            notes: pur.notes || undefined,
            synced: 1
          }))
        );
      }

      if (data.purchase_items && Array.isArray(data.purchase_items) && data.purchase_items.length > 0) {
        await db.purchase_items.bulkPut(
          data.purchase_items.map((pi: any) => ({
            id: pi.id,
            purchase_id: pi.purchase_id,
            product_id: pi.product_id,
            quantity: Number(pi.quantity || 1),
            unit_price: Number(pi.unit_price || 0),
            subtotal: Number(pi.subtotal || 0),
            synced: 1
          }))
        );
      }

      // 15. Inventories & Inventory Items
      if (data.inventories && Array.isArray(data.inventories) && data.inventories.length > 0) {
        await db.inventories.bulkPut(
          data.inventories.map((inv: any) => ({
            id: inv.id,
            reference: inv.reference || `INV-${inv.id}`,
            status: inv.status || 'draft',
            user_id: inv.user_id || 1,
            date: inv.date || new Date().toISOString().slice(0, 10),
            notes: inv.notes || undefined,
            synced: 1
          }))
        );
      }

      if (data.inventory_items && Array.isArray(data.inventory_items) && data.inventory_items.length > 0) {
        await db.inventory_items.bulkPut(
          data.inventory_items.map((ii: any) => ({
            id: ii.id,
            inventory_id: ii.inventory_id,
            product_id: ii.product_id,
            theoretical_quantity: Number(ii.theoretical_quantity || 0),
            real_quantity: Number(ii.real_quantity || 0),
            difference: Number(ii.difference || 0),
            cost_variance: Number(ii.cost_variance || 0),
            synced: 1
          }))
        );
      }

      // 16. Deliveries
      if (data.deliveries && Array.isArray(data.deliveries) && data.deliveries.length > 0) {
        await db.deliveries.bulkPut(
          data.deliveries.map((d: any) => ({
            id: d.id,
            sale_id: d.sale_id,
            delivery_person_id: d.delivery_person_id || undefined,
            customer_name: d.customer_name,
            customer_phone: d.customer_phone || undefined,
            delivery_address: d.delivery_address,
            status: d.status || 'pending',
            otp_code: d.otp_code || undefined,
            tracking_number: d.tracking_number || undefined,
            notes: d.notes || undefined,
            created_at: d.created_at,
            delivered_at: d.delivered_at || undefined,
            synced: 1
          }))
        );
      }

      return true;
    } catch (err) {
      console.warn('Erreur pullFromRemote:', err);
      return false;
    }
  }

  // PUSH : Envoyer les modifications locales (synced: 0) vers MySQL
  public async pushToRemote(): Promise<boolean> {
    try {
      const [
        unsyncedUsers,
        unsyncedRegisters,
        unsyncedProducts,
        unsyncedCategories,
        unsyncedSuppliers,
        unsyncedCustomers,
        unsyncedSales,
        unsyncedSaleItems,
        unsyncedSessions,
        unsyncedMovements,
        unsyncedStockMovements,
        unsyncedExpenses,
        unsyncedPurchases,
        unsyncedPurchaseItems,
        unsyncedInventories,
        unsyncedInventoryItems,
        unsyncedDeliveries,
        allSettings
      ] = await Promise.all([
        db.users.where('synced').equals(0).toArray(),
        db.cash_registers.where('synced').equals(0).toArray(),
        db.products.where('synced').equals(0).toArray(),
        db.categories.where('synced').equals(0).toArray(),
        db.suppliers.where('synced').equals(0).toArray(),
        db.customers.where('synced').equals(0).toArray(),
        db.sales.where('synced').equals(0).toArray(),
        db.sale_items.where('synced').equals(0).toArray(),
        db.cash_sessions.where('synced').equals(0).toArray(),
        db.cash_movements.where('synced').equals(0).toArray(),
        db.stock_movements.where('synced').equals(0).toArray(),
        db.expenses.where('synced').equals(0).toArray(),
        db.purchases.where('synced').equals(0).toArray(),
        db.purchase_items.where('synced').equals(0).toArray(),
        db.inventories.where('synced').equals(0).toArray(),
        db.inventory_items.where('synced').equals(0).toArray(),
        db.deliveries.where('synced').equals(0).toArray(),
        db.settings.toArray()
      ]);

      const isSettingsDirty = sessionStorage.getItem('gestmag_settings_dirty') === 'true';

      const hasUnsynced =
        isSettingsDirty ||
        unsyncedUsers.length > 0 ||
        unsyncedRegisters.length > 0 ||
        unsyncedProducts.length > 0 ||
        unsyncedCategories.length > 0 ||
        unsyncedSuppliers.length > 0 ||
        unsyncedCustomers.length > 0 ||
        unsyncedSales.length > 0 ||
        unsyncedSaleItems.length > 0 ||
        unsyncedSessions.length > 0 ||
        unsyncedMovements.length > 0 ||
        unsyncedStockMovements.length > 0 ||
        unsyncedExpenses.length > 0 ||
        unsyncedPurchases.length > 0 ||
        unsyncedPurchaseItems.length > 0 ||
        unsyncedInventories.length > 0 ||
        unsyncedInventoryItems.length > 0 ||
        unsyncedDeliveries.length > 0;

      if (!hasUnsynced) return true;

      const payload = {
        tables: {
          users: unsyncedUsers,
          settings: allSettings,
          cash_registers: unsyncedRegisters,
          products: unsyncedProducts,
          categories: unsyncedCategories,
          suppliers: unsyncedSuppliers,
          customers: unsyncedCustomers,
          sales: unsyncedSales,
          sale_items: unsyncedSaleItems,
          cash_sessions: unsyncedSessions,
          cash_movements: unsyncedMovements,
          stock_movements: unsyncedStockMovements,
          expenses: unsyncedExpenses,
          purchases: unsyncedPurchases,
          purchase_items: unsyncedPurchaseItems,
          inventories: unsyncedInventories,
          inventory_items: unsyncedInventoryItems,
          deliveries: unsyncedDeliveries
        }
      };

      const res = await fetch(`${API_BASE_URL}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) return false;
      const json = await res.json();
      if (!json.success) return false;

      sessionStorage.removeItem('gestmag_settings_dirty');

      // Marquer localement comme synchronisé
      await this.markAllAsSynced();
      return true;
    } catch (err) {
      console.warn('Erreur pushToRemote:', err);
      return false;
    }
  }

  public async syncNow(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) return { success: false, message: 'Synchronisation déjà en cours...' };

    this.isSyncing = true;
    this.currentStatus.isSyncing = true;
    this.currentStatus.message = 'Synchronisation avec MySQL...';
    this.notify();

    try {
      // 1. PUSH : Envoyer les modifications locales en attente
      await this.pushToRemote();

      // 2. PULL : Récupérer les données à jour depuis MySQL
      await this.pullFromRemote();

      this.currentStatus.lastSyncTime = new Date().toLocaleTimeString('fr-FR');
      this.currentStatus.unsyncedCount = 0;
      this.currentStatus.message = 'Synchronisé avec MySQL';
      this.currentStatus.isSyncing = false;
      this.isSyncing = false;
      this.notify();

      return { success: true, message: 'Synchronisation réussie avec MySQL' };
    } catch (err: any) {
      this.currentStatus.isSyncing = false;
      this.isSyncing = false;
      this.currentStatus.message = `Erreur sync: ${err.message}`;
      this.notify();
      return { success: false, message: err.message };
    }
  }

  private async markAllAsSynced() {
    await Promise.all([
      db.users.toCollection().modify({ synced: 1 }),
      db.categories.toCollection().modify({ synced: 1 }),
      db.products.toCollection().modify({ synced: 1 }),
      db.suppliers.toCollection().modify({ synced: 1 }),
      db.customers.toCollection().modify({ synced: 1 }),
      db.cash_registers.toCollection().modify({ synced: 1 }),
      db.sales.toCollection().modify({ synced: 1 }),
      db.sale_items.toCollection().modify({ synced: 1 }),
      db.stock_movements.toCollection().modify({ synced: 1 }),
      db.deliveries.toCollection().modify({ synced: 1 }),
      db.expenses.toCollection().modify({ synced: 1 }),
      db.inventories.toCollection().modify({ synced: 1 }),
      db.inventory_items.toCollection().modify({ synced: 1 }),
      db.purchases.toCollection().modify({ synced: 1 }),
      db.purchase_items.toCollection().modify({ synced: 1 }),
      db.cash_sessions.toCollection().modify({ synced: 1 }),
      db.cash_movements.toCollection().modify({ synced: 1 }),
    ]);
  }
}

export const syncService = new SyncService();

