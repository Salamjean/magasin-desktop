import { db, setPullingFromRemote } from './db';

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || 'https://bnelboutique.com/api';

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
        purchases, cashRegisters, cashSessions, cashMovements,
        deletions
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
        db.sync_queue.where('action').equals('delete').count()
      ]);

      return (
        users + categories + products + suppliers + customers +
        sales + saleItems + stockMoves + deliveries + expenses +
        purchases + cashRegisters + cashSessions + cashMovements +
        deletions
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
    setPullingFromRemote(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sync/pull`);
      if (!res.ok) return false;
      const json = await res.json();
      if (!json.success || !json.data) return false;

      const data = json.data;

      // Récupérer les suppressions locales en attente pour ne jamais réinsérer des éléments supprimés localement
      const allPendingDeletes = await db.sync_queue.where('action').equals('delete').toArray();
      const pendingDeleteMap: Record<string, Set<number>> = {};
      allPendingDeletes.forEach((d) => {
        if (!pendingDeleteMap[d.tableName]) pendingDeleteMap[d.tableName] = new Set();
        pendingDeleteMap[d.tableName].add(d.recordId);
      });

      // 1. Settings
      const isSettingsDirty = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gestmag_settings_dirty') === 'true';
      if (!isSettingsDirty && data.settings && Array.isArray(data.settings) && data.settings.length > 0) {
        await db.settings.bulkPut(
          data.settings.map((s: any) => ({ key: s.key, value: String(s.value || '') }))
        );
        window.dispatchEvent(new Event('gestmag:settings_updated'));
      }

      // 2. Users
      if (data.users && Array.isArray(data.users)) {
        const delUsers = pendingDeleteMap['users'] || new Set();
        const validUsers = data.users.filter((u: any) => !delUsers.has(Number(u.id)));
        const remoteIds = new Set(validUsers.map((u: any) => Number(u.id)));
        const localUsers = await db.users.toArray();
        const toDelete = localUsers.filter((lu) => lu.id && lu.synced === 1 && !remoteIds.has(lu.id));
        if (toDelete.length > 0) {
          await db.users.bulkDelete(toDelete.map((lu) => lu.id!));
        }

        if (validUsers.length > 0) {
          await db.users.bulkPut(
            validUsers.map((u: any) => ({
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
      }

      // 3. Cash Registers
      if (data.cash_registers && Array.isArray(data.cash_registers)) {
        const delRegs = pendingDeleteMap['cash_registers'] || new Set();
        const validRegs = data.cash_registers.filter((cr: any) => !delRegs.has(Number(cr.id)));
        const remoteIds = new Set(validRegs.map((cr: any) => Number(cr.id)));
        const localRegs = await db.cash_registers.toArray();
        const toDelete = localRegs.filter((lr) => lr.id && lr.synced === 1 && !remoteIds.has(lr.id));
        if (toDelete.length > 0) {
          await db.cash_registers.bulkDelete(toDelete.map((lr) => lr.id!));
        }

        if (validRegs.length > 0) {
          await db.cash_registers.bulkPut(
            validRegs.map((cr: any) => ({
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
      if (data.categories && Array.isArray(data.categories)) {
        const delCats = pendingDeleteMap['categories'] || new Set();
        const validCats = data.categories.filter((c: any) => !delCats.has(Number(c.id)));
        const remoteIds = new Set(validCats.map((c: any) => Number(c.id)));
        const localItems = await db.categories.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.categories.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validCats.length > 0) {
          await db.categories.bulkPut(
            validCats.map((c: any) => ({
              id: c.id,
              name: c.name,
              description: c.description || undefined,
              icon: c.icon || 'Package',
              color: c.color || '#0284c7',
              synced: 1
            }))
          );
        }
      }

      // 5. Suppliers
      if (data.suppliers && Array.isArray(data.suppliers)) {
        const delSups = pendingDeleteMap['suppliers'] || new Set();
        const validSups = data.suppliers.filter((s: any) => !delSups.has(Number(s.id)));
        const remoteIds = new Set(validSups.map((s: any) => Number(s.id)));
        const localItems = await db.suppliers.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.suppliers.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validSups.length > 0) {
          await db.suppliers.bulkPut(
            validSups.map((s: any) => ({
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
      }

      // 6. Customers
      if (data.customers && Array.isArray(data.customers)) {
        const delCusts = pendingDeleteMap['customers'] || new Set();
        const validCusts = data.customers.filter((c: any) => !delCusts.has(Number(c.id)));
        const remoteIds = new Set(validCusts.map((c: any) => Number(c.id)));
        const localItems = await db.customers.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.customers.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validCusts.length > 0) {
          await db.customers.bulkPut(
            validCusts.map((c: any) => ({
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
      }

      // 7. Products
      if (data.products && Array.isArray(data.products)) {
        const delProds = pendingDeleteMap['products'] || new Set();
        const validProds = data.products.filter((p: any) => !delProds.has(Number(p.id)));
        const remoteIds = new Set(validProds.map((p: any) => Number(p.id)));
        const localItems = await db.products.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.products.bulkDelete(toDelete.map((item) => item.id!));
        }

        const unsyncedProducts = await db.products.where('synced').equals(0).toArray();
        const unsyncedProdIds = new Set(unsyncedProducts.map((p) => p.id));

        const prodsToPut = validProds
          .filter((p: any) => !unsyncedProdIds.has(p.id))
          .map((p: any) => ({
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
          }));

        if (prodsToPut.length > 0) {
          await db.products.bulkPut(prodsToPut);
        }
      }

      // 8. Cash Sessions
      if (data.cash_sessions && Array.isArray(data.cash_sessions)) {
        const delSess = pendingDeleteMap['cash_sessions'] || new Set();
        const validSess = data.cash_sessions.filter((cs: any) => !delSess.has(Number(cs.id)));
        const remoteIds = new Set(validSess.map((cs: any) => Number(cs.id)));
        const localItems = await db.cash_sessions.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.cash_sessions.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validSess.length > 0) {
          await db.cash_sessions.bulkPut(
            validSess.map((cs: any) => ({
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
      }

      // 9. Cash Movements
      if (data.cash_movements && Array.isArray(data.cash_movements)) {
        const delMovs = pendingDeleteMap['cash_movements'] || new Set();
        const validMovs = data.cash_movements.filter((cm: any) => !delMovs.has(Number(cm.id)));
        const remoteIds = new Set(validMovs.map((cm: any) => Number(cm.id)));
        const localItems = await db.cash_movements.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.cash_movements.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validMovs.length > 0) {
          await db.cash_movements.bulkPut(
            validMovs.map((cm: any) => ({
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
      }

      // 10. Sales
      if (data.sales && Array.isArray(data.sales)) {
        const delSales = pendingDeleteMap['sales'] || new Set();
        const validSales = data.sales.filter((s: any) => !delSales.has(Number(s.id)));
        const remoteIds = new Set(validSales.map((s: any) => Number(s.id)));
        const localSales = await db.sales.toArray();
        const toDelete = localSales.filter((ls) => ls.id && ls.synced === 1 && !remoteIds.has(ls.id));
        if (toDelete.length > 0) {
          await db.sales.bulkDelete(toDelete.map((ls) => ls.id!));
        }

        const unsyncedSales = await db.sales.where('synced').equals(0).toArray();
        const unsyncedSaleIds = new Set(unsyncedSales.map((s) => s.id));

        const salesToPut = validSales
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
      if (data.sale_items && Array.isArray(data.sale_items)) {
        const delSaleItems = pendingDeleteMap['sale_items'] || new Set();
        const validSaleItems = data.sale_items.filter((si: any) => !delSaleItems.has(Number(si.id)));
        const remoteIds = new Set(validSaleItems.map((si: any) => Number(si.id)));
        const localItems = await db.sale_items.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.sale_items.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validSaleItems.length > 0) {
          await db.sale_items.bulkPut(
            validSaleItems.map((item: any) => ({
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
      }

      // 12. Stock Movements
      if (data.stock_movements && Array.isArray(data.stock_movements)) {
        const delStockMoves = pendingDeleteMap['stock_movements'] || new Set();
        const validStockMoves = data.stock_movements.filter((sm: any) => !delStockMoves.has(Number(sm.id)));
        const remoteIds = new Set(validStockMoves.map((sm: any) => Number(sm.id)));
        const localItems = await db.stock_movements.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.stock_movements.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validStockMoves.length > 0) {
          await db.stock_movements.bulkPut(
            validStockMoves.map((sm: any) => ({
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
      }

      // 13. Expenses
      if (data.expenses && Array.isArray(data.expenses)) {
        const delExp = pendingDeleteMap['expenses'] || new Set();
        const validExp = data.expenses.filter((e: any) => !delExp.has(Number(e.id)));
        const remoteIds = new Set(validExp.map((e: any) => Number(e.id)));
        const localItems = await db.expenses.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.expenses.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validExp.length > 0) {
          await db.expenses.bulkPut(
            validExp.map((e: any) => ({
              id: e.id,
              user_id: e.user_id,
              title: e.title,
              amount: Number(e.amount || 0),
              category: e.category || 'Général',
              payment_method: e.payment_method || 'cash',
              date: e.date,
              notes: e.notes || undefined,
              synced: 1
            }))
          );
        }
      }

      // 14. Purchases & Purchase Items
      if (data.purchases && Array.isArray(data.purchases)) {
        const delPurch = pendingDeleteMap['purchases'] || new Set();
        const validPurch = data.purchases.filter((p: any) => !delPurch.has(Number(p.id)));
        const remoteIds = new Set(validPurch.map((p: any) => Number(p.id)));
        const localItems = await db.purchases.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.purchases.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validPurch.length > 0) {
          await db.purchases.bulkPut(
            validPurch.map((pur: any) => ({
              id: pur.id,
              reference: pur.reference || `ACH-${pur.id}`,
              supplier_id: pur.supplier_id,
              user_id: pur.user_id || 1,
              total_amount: Number(pur.total_amount || 0),
              status: pur.status || 'ordered',
              created_at: pur.created_at || pur.order_date || new Date().toISOString(),
              notes: pur.notes || undefined,
              synced: 1
            }))
          );
        }
      }

      if (data.purchase_items && Array.isArray(data.purchase_items)) {
        const delPurchItems = pendingDeleteMap['purchase_items'] || new Set();
        const validPurchItems = data.purchase_items.filter((pi: any) => !delPurchItems.has(Number(pi.id)));
        const remoteIds = new Set(validPurchItems.map((pi: any) => Number(pi.id)));
        const localItems = await db.purchase_items.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.purchase_items.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validPurchItems.length > 0) {
          await db.purchase_items.bulkPut(
            validPurchItems.map((pi: any) => ({
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
      }

      // 15. Inventories & Inventory Items
      if (data.inventories && Array.isArray(data.inventories)) {
        const delInv = pendingDeleteMap['inventories'] || new Set();
        const validInv = data.inventories.filter((inv: any) => !delInv.has(Number(inv.id)));
        const remoteIds = new Set(validInv.map((inv: any) => Number(inv.id)));
        const localItems = await db.inventories.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.inventories.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validInv.length > 0) {
          await db.inventories.bulkPut(
            validInv.map((inv: any) => ({
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
      }

      if (data.inventory_items && Array.isArray(data.inventory_items)) {
        const delInvItems = pendingDeleteMap['inventory_items'] || new Set();
        const validInvItems = data.inventory_items.filter((ii: any) => !delInvItems.has(Number(ii.id)));
        const remoteIds = new Set(validInvItems.map((ii: any) => Number(ii.id)));
        const localItems = await db.inventory_items.toArray();
        const toDelete = localItems.filter((item) => item.id && item.synced === 1 && !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await db.inventory_items.bulkDelete(toDelete.map((item) => item.id!));
        }
        if (validInvItems.length > 0) {
          await db.inventory_items.bulkPut(
            validInvItems.map((ii: any) => ({
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
      }

      // 16. Deliveries
      if (data.deliveries && Array.isArray(data.deliveries)) {
        const delDels = pendingDeleteMap['deliveries'] || new Set();
        const validDels = data.deliveries.filter((d: any) => !delDels.has(Number(d.id)));
        const remoteIds = new Set(validDels.map((d: any) => Number(d.id)));
        const localDels = await db.deliveries.toArray();
        const toDelete = localDels.filter((ld) => ld.id && ld.synced === 1 && !remoteIds.has(ld.id));
        if (toDelete.length > 0) {
          await db.deliveries.bulkDelete(toDelete.map((ld) => ld.id!));
        }

        if (validDels.length > 0) {
          await db.deliveries.bulkPut(
            validDels.map((d: any) => ({
              id: d.id,
              sale_id: d.sale_id ? Number(d.sale_id) : undefined,
              customer_id: d.customer_id ? Number(d.customer_id) : undefined,
              customer_name: d.customer_name || 'Client',
              customer_phone: d.customer_phone || '',
              delivery_address: d.delivery_address || 'Adresse',
              amount_to_collect: Number(d.amount_to_collect || 0),
              livreur_id: d.livreur_id ? Number(d.livreur_id) : (d.delivery_person_id ? Number(d.delivery_person_id) : undefined),
              status: d.status || 'pending',
              otp_code: d.otp_code || '0000',
              notes: d.notes || undefined,
              items_json: d.items_json || undefined,
              delivery_type: d.delivery_type || (d.sale_id ? 'sale' : 'free'),
              created_at: d.created_at || new Date().toISOString(),
              delivered_at: d.delivered_at || undefined,
              synced: 1
            }))
          );
        }
      }

      window.dispatchEvent(new Event('gestmag:data_synced'));
      return true;
    } catch (err) {
      console.warn('Erreur pullFromRemote:', err);
      return false;
    } finally {
      setPullingFromRemote(false);
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
        allSettings,
        pendingDeletions
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
        db.settings.toArray(),
        db.sync_queue.where('action').equals('delete').toArray()
      ]);

function toMySQLDateTime(dateStr?: string | null): string {
  if (!dateStr) {
    const d = new Date();
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return now.toISOString().slice(0, 19).replace('T', ' ');
    }
    return d.toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace('T', ' ');
  }
}

function toMySQLDate(dateStr?: string | null): string {
  if (!dateStr) {
    return new Date().toISOString().slice(0, 10);
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

      const isSettingsDirty = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gestmag_settings_dirty') === 'true';

      const hasUnsynced =
        pendingDeletions.length > 0 ||
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

      // Nettoyage et formatage strict des données pour compatibilité MySQL
      const formattedProducts = unsyncedProducts.map(p => ({
        id: p.id,
        name: p.name || 'Produit sans nom',
        reference: p.reference || `REF-${p.id || Date.now()}`,
        barcode: p.barcode || `BAR-${p.id || Date.now()}`,
        category_id: p.category_id || null,
        supplier_id: p.supplier_id || null,
        purchase_price: Number(p.purchase_price || 0),
        selling_price: Number(p.selling_price || 0),
        stock_quantity: Number(p.stock_quantity || 0),
        min_stock: Number(p.min_stock || 5),
        unit: p.unit || 'pcs',
        image: p.image || null,
        is_active: (p.is_active as any) === false || (p.is_active as any) === 0 ? 0 : 1,
        user_id: p.user_id || 1,
        created_at: toMySQLDateTime(p.created_at)
      }));

      const formattedStockMovements = unsyncedStockMovements.map(sm => ({
        id: sm.id,
        product_id: sm.product_id,
        type: sm.type || 'adjustment',
        quantity: Number(sm.quantity || 0),
        reference: sm.reference || `MVT-${sm.id || Date.now()}`,
        reason: sm.reason || 'Stock initial',
        user_id: sm.user_id || 1,
        created_at: toMySQLDateTime(sm.created_at)
      }));

      const formattedCategories = unsyncedCategories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || null,
        icon: c.icon || 'Package',
        color: c.color || '#0284c7'
      }));

      const formattedSuppliers = unsyncedSuppliers.map(s => ({
        id: s.id,
        name: s.name,
        contact_name: s.contact_name || null,
        email: s.email || null,
        phone: s.phone || null,
        address: s.address || null,
        tax_number: s.tax_number || null,
        notes: s.notes || null
      }));

      const formattedCustomers = unsyncedCustomers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        credit_limit: Number(c.credit_limit || 0),
        current_debt: Number(c.current_debt || 0),
        loyalty_points: Number(c.loyalty_points || 0)
      }));

      const formattedSales = unsyncedSales.map(s => ({
        id: s.id,
        invoice_number: s.invoice_number,
        user_id: s.user_id || 1,
        customer_id: s.customer_id || null,
        cash_session_id: s.cash_session_id || null,
        subtotal: Number(s.subtotal || s.total_amount || 0),
        discount_amount: Number(s.discount_amount || 0),
        tax_amount: Number(s.tax_amount || 0),
        total_amount: Number(s.total_amount || 0),
        paid_amount: Number(s.paid_amount || 0),
        change_amount: Number(s.change_amount || 0),
        payment_method: s.payment_method || 'cash',
        payment_status: s.payment_status || 'paid',
        notes: s.notes || null,
        created_at: toMySQLDateTime(s.created_at)
      }));

      const formattedSaleItems = unsyncedSaleItems.map(si => ({
        id: si.id,
        sale_id: si.sale_id,
        product_id: si.product_id,
        product_name: si.product_name || 'Article',
        quantity: Number(si.quantity || 1),
        unit_price: Number(si.unit_price || 0),
        subtotal: Number(si.subtotal || 0)
      }));

      const formattedSessions = unsyncedSessions.map(cs => ({
        id: cs.id,
        cash_register_id: cs.cash_register_id || 1,
        user_id: cs.user_id || 1,
        opening_amount: Number(cs.opening_amount || 0),
        closing_amount: cs.closing_amount !== undefined ? Number(cs.closing_amount) : null,
        expected_closing_amount: cs.expected_closing_amount !== undefined ? Number(cs.expected_closing_amount) : null,
        status: cs.status || 'open',
        opened_at: toMySQLDateTime(cs.opened_at),
        closed_at: cs.closed_at ? toMySQLDateTime(cs.closed_at) : null,
        notes: cs.notes || null
      }));

      const formattedMovements = unsyncedMovements.map(cm => ({
        id: cm.id,
        cash_session_id: cm.cash_session_id,
        type: cm.type || 'deposit',
        amount: Number(cm.amount || 0),
        reason: cm.reason || null,
        created_at: toMySQLDateTime(cm.created_at)
      }));

      const formattedExpenses = unsyncedExpenses.map(e => ({
        id: e.id,
        user_id: e.user_id || 1,
        title: e.title,
        amount: Number(e.amount || 0),
        category: e.category || 'Général',
        payment_method: e.payment_method || 'cash',
        date: toMySQLDate(e.date),
        notes: e.notes || null,
        receipt_image: (e as any).receipt_image || null
      }));

      const formattedPurchases = unsyncedPurchases.map(pur => ({
        id: pur.id,
        reference: pur.reference || `ACH-${pur.id || Date.now()}`,
        supplier_id: pur.supplier_id,
        user_id: pur.user_id || 1,
        total_amount: Number(pur.total_amount || 0),
        status: pur.status || 'pending',
        created_at: toMySQLDateTime(pur.created_at),
        delivery_date: (pur as any).delivery_date ? toMySQLDate((pur as any).delivery_date) : null,
        notes: pur.notes || null
      }));

      const formattedPurchaseItems = unsyncedPurchaseItems.map(pi => ({
        id: pi.id,
        purchase_id: pi.purchase_id,
        product_id: pi.product_id,
        quantity: Number(pi.quantity || 1),
        unit_price: Number(pi.unit_price || 0),
        subtotal: Number(pi.subtotal || 0)
      }));

      const formattedInventories = unsyncedInventories.map(inv => ({
        id: inv.id,
        reference: inv.reference || `INV-${inv.id || Date.now()}`,
        status: inv.status || 'draft',
        user_id: inv.user_id || 1,
        date: toMySQLDate(inv.date),
        notes: inv.notes || null
      }));

      const formattedInventoryItems = unsyncedInventoryItems.map(ii => ({
        id: ii.id,
        inventory_id: ii.inventory_id,
        product_id: ii.product_id,
        theoretical_quantity: Number(ii.theoretical_quantity || 0),
        real_quantity: Number(ii.real_quantity || 0),
        difference: Number(ii.difference || 0),
        cost_variance: Number(ii.cost_variance || 0)
      }));

      const formattedDeliveries = unsyncedDeliveries.map(d => ({
        id: d.id,
        sale_id: d.sale_id && Number(d.sale_id) > 0 ? Number(d.sale_id) : null,
        customer_id: d.customer_id && Number(d.customer_id) > 0 ? Number(d.customer_id) : null,
        livreur_id: d.livreur_id ? Number(d.livreur_id) : ((d as any).delivery_person_id ? Number((d as any).delivery_person_id) : null),
        delivery_person_id: d.livreur_id ? Number(d.livreur_id) : null,
        customer_name: d.customer_name || 'Client',
        customer_phone: d.customer_phone || null,
        delivery_address: d.delivery_address || 'Adresse',
        amount_to_collect: Number(d.amount_to_collect || 0),
        status: d.status || 'pending',
        otp_code: d.otp_code || null,
        tracking_number: (d as any).tracking_number || null,
        notes: d.notes || null,
        items_json: d.items_json || null,
        delivery_type: d.delivery_type || (d.sale_id ? 'sale' : 'free'),
        created_at: toMySQLDateTime(d.created_at),
        delivered_at: d.delivered_at ? toMySQLDateTime(d.delivered_at) : null
      }));

      const payload = {
        tables: {
          users: unsyncedUsers,
          settings: allSettings,
          cash_registers: unsyncedRegisters,
          categories: formattedCategories,
          suppliers: formattedSuppliers,
          customers: formattedCustomers,
          products: formattedProducts,
          stock_movements: formattedStockMovements,
          cash_sessions: formattedSessions,
          cash_movements: formattedMovements,
          sales: formattedSales,
          sale_items: formattedSaleItems,
          expenses: formattedExpenses,
          purchases: formattedPurchases,
          purchase_items: formattedPurchaseItems,
          inventories: formattedInventories,
          inventory_items: formattedInventoryItems,
          deliveries: formattedDeliveries
        },
        deletions: pendingDeletions.map((d) => ({ table: d.tableName, id: d.recordId }))
      };

      const res = await fetch(`${API_BASE_URL}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          sessionStorage.removeItem('gestmag_settings_dirty');
          if (pendingDeletions.length > 0) {
            await db.sync_queue.where('action').equals('delete').delete();
          }
          await this.markAllAsSynced();
          return true;
        }
      }

      // Fallback par table : si le lot global est rejeté par le serveur, envoyer table par table
      console.warn('Batch sync push rejeté, tentative de synchronisation par module...');
      let anySuccess = false;

      for (const [tableName, items] of Object.entries(payload.tables)) {
        if (Array.isArray(items) && items.length > 0) {
          try {
            const tableRes = await fetch(`${API_BASE_URL}/sync/push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tables: { [tableName]: items } })
            });
            if (tableRes.ok) {
              const tableJson = await tableRes.json();
              if (tableJson.success) {
                anySuccess = true;
                const dbTable = (db as any)[tableName];
                if (dbTable && typeof dbTable.where === 'function') {
                  await dbTable.where('synced').equals(0).modify({ synced: 1 });
                }
              }
            }
          } catch (tErr) {
            console.warn(`Erreur sync module ${tableName}:`, tErr);
          }
        }
      }

      return anySuccess;
    } catch (err) {
      console.warn('Erreur pushToRemote:', err);
      return false;
    }
  }

  // Réinitialisation et resynchronisation complète depuis le serveur de production
  public async resetAndResyncFromRemote(): Promise<boolean> {
    try {
      await Promise.all([
        db.products.clear(),
        db.categories.clear(),
        db.suppliers.clear(),
        db.customers.clear(),
        db.sales.clear(),
        db.sale_items.clear(),
        db.stock_movements.clear(),
        db.cash_sessions.clear(),
        db.cash_movements.clear(),
        db.expenses.clear(),
        db.purchases.clear(),
        db.purchase_items.clear(),
        db.inventories.clear(),
        db.inventory_items.clear(),
        db.deliveries.clear(),
      ]);

      const pulled = await this.pullFromRemote();
      window.dispatchEvent(new Event('gestmag:data_synced'));
      return pulled;
    } catch (err) {
      console.error('Erreur resetAndResyncFromRemote:', err);
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
      const pushOk = await this.pushToRemote();

      // 2. PULL : Récupérer les données à jour depuis MySQL
      const pullOk = await this.pullFromRemote();

      const unsynced = await this.getUnsyncedCount();
      this.currentStatus.unsyncedCount = unsynced;
      this.currentStatus.lastSyncTime = new Date().toLocaleTimeString('fr-FR');
      this.currentStatus.isSyncing = false;
      this.isSyncing = false;

      if (pushOk && pullOk) {
        this.currentStatus.message = 'Synchronisé avec MySQL';
        this.notify();
        return { success: true, message: 'Synchronisation réussie avec MySQL' };
      } else if (!pushOk) {
        this.currentStatus.message = 'Échec de l’envoi des données vers MySQL';
        this.notify();
        return { success: false, message: 'Échec de l’envoi des données locales' };
      } else {
        this.currentStatus.message = 'Données envoyées, erreur de mise à jour locale';
        this.notify();
        return { success: false, message: 'Échec de la récupération des données' };
      }
    } catch (err: any) {
      this.currentStatus.isSyncing = false;
      this.isSyncing = false;
      this.currentStatus.unsyncedCount = await this.getUnsyncedCount();
      this.currentStatus.message = `Erreur sync: ${err.message}`;
      this.notify();
      return { success: false, message: err.message };
    }
  }

  private async markAllAsSynced() {
    await Promise.all([
      db.users.where('synced').equals(0).modify({ synced: 1 }),
      db.categories.where('synced').equals(0).modify({ synced: 1 }),
      db.products.where('synced').equals(0).modify({ synced: 1 }),
      db.suppliers.where('synced').equals(0).modify({ synced: 1 }),
      db.customers.where('synced').equals(0).modify({ synced: 1 }),
      db.cash_registers.where('synced').equals(0).modify({ synced: 1 }),
      db.sales.where('synced').equals(0).modify({ synced: 1 }),
      db.sale_items.where('synced').equals(0).modify({ synced: 1 }),
      db.stock_movements.where('synced').equals(0).modify({ synced: 1 }),
      db.deliveries.where('synced').equals(0).modify({ synced: 1 }),
      db.expenses.where('synced').equals(0).modify({ synced: 1 }),
      db.inventories.where('synced').equals(0).modify({ synced: 1 }),
      db.inventory_items.where('synced').equals(0).modify({ synced: 1 }),
      db.purchases.where('synced').equals(0).modify({ synced: 1 }),
      db.purchase_items.where('synced').equals(0).modify({ synced: 1 }),
      db.cash_sessions.where('synced').equals(0).modify({ synced: 1 }),
      db.cash_movements.where('synced').equals(0).modify({ synced: 1 }),
    ]);
  }
}

export const syncService = new SyncService();

