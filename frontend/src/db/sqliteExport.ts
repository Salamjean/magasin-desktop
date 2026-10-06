import initSqlJs from 'sql.js';
// @ts-ignore - Vite ?url import for WebAssembly assets
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { db } from './db';

export async function exportIndexedDBToSQLite(): Promise<Uint8Array> {
  // Initialize sql.js using Vite's bundled WebAssembly asset URL
  const SQL = await initSqlJs({
    locateFile: () => sqlWasmUrl
  });

  const sqliteDb = new SQL.Database();

  // 1. Create SQLite Tables
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      role TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      tax_number TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 0,
      current_debt REAL DEFAULT 0,
      loyalty_points INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      reference TEXT NOT NULL,
      barcode TEXT NOT NULL,
      category_id INTEGER,
      purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      unit TEXT DEFAULT 'pièce',
      image TEXT,
      is_active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS cash_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_register_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      opening_amount REAL DEFAULT 0,
      closing_amount REAL,
      expected_closing_amount REAL,
      status TEXT DEFAULT 'open',
      opened_at TEXT,
      closed_at TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_session_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT,
      created_at TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      customer_id INTEGER,
      cash_session_id INTEGER,
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'paid',
      notes TEXT,
      created_at TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      reference TEXT,
      reason TEXT,
      user_id INTEGER,
      created_at TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      delivery_address TEXT,
      livreur_id INTEGER,
      status TEXT DEFAULT 'pending',
      otp_code TEXT,
      notes TEXT,
      created_at TEXT,
      delivered_at TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      user_id INTEGER,
      date TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS inventories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT,
      status TEXT DEFAULT 'draft',
      user_id INTEGER,
      date TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      theoretical_quantity REAL DEFAULT 0,
      real_quantity REAL DEFAULT 0,
      difference REAL DEFAULT 0,
      cost_variance REAL DEFAULT 0,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT,
      supplier_id INTEGER NOT NULL,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'ordered',
      received_at TEXT,
      user_id INTEGER,
      notes TEXT,
      created_at TEXT,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      synced INTEGER DEFAULT 1
    );
  `);

  // 2. Fetch all Dexie Data and Insert into SQLite
  const [
    users, settings, cashRegisters, categories, suppliers, customers,
    products, cashSessions, cashMovements, sales, saleItems,
    stockMovements, deliveries, expenses, inventories, inventoryItems,
    purchases, purchaseItems
  ] = await Promise.all([
    db.users.toArray(),
    db.settings.toArray(),
    db.cash_registers.toArray(),
    db.categories.toArray(),
    db.suppliers.toArray(),
    db.customers.toArray(),
    db.products.toArray(),
    db.cash_sessions.toArray(),
    db.cash_movements.toArray(),
    db.sales.toArray(),
    db.sale_items.toArray(),
    db.stock_movements.toArray(),
    db.deliveries.toArray(),
    db.expenses.toArray(),
    db.inventories.toArray(),
    db.inventory_items.toArray(),
    db.purchases.toArray(),
    db.purchase_items.toArray(),
  ]);

  // Insert Users
  for (const u of users) {
    sqliteDb.run(
      `INSERT INTO users (id, name, email, password, role, phone, avatar, active, synced, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id ?? null, u.name, u.email, u.password ?? null, u.role, u.phone ?? null, u.avatar ?? null, u.active ? 1 : 0, u.synced ?? 1, u.created_at ?? new Date().toISOString()]
    );
  }

  // Insert Settings
  for (const s of settings) {
    sqliteDb.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [s.key, s.value]);
  }

  // Insert Cash Registers
  for (const cr of cashRegisters) {
    sqliteDb.run(
      `INSERT INTO cash_registers (id, name, code, is_active, notes, synced) VALUES (?, ?, ?, ?, ?, ?)`,
      [cr.id ?? null, cr.name, cr.code, cr.is_active ? 1 : 0, cr.notes ?? null, cr.synced ?? 1]
    );
  }

  // Insert Categories
  for (const cat of categories) {
    sqliteDb.run(
      `INSERT INTO categories (id, name, description, icon, color, synced) VALUES (?, ?, ?, ?, ?, ?)`,
      [cat.id ?? null, cat.name, cat.description ?? null, cat.icon ?? null, cat.color ?? null, cat.synced ?? 1]
    );
  }

  // Insert Suppliers
  for (const sup of suppliers) {
    sqliteDb.run(
      `INSERT INTO suppliers (id, name, contact_name, email, phone, address, tax_number, notes, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sup.id ?? null, sup.name, sup.contact_name ?? null, sup.email ?? null, sup.phone ?? null, sup.address ?? null, sup.tax_number ?? null, sup.notes ?? null, sup.synced ?? 1]
    );
  }

  // Insert Customers
  for (const cus of customers) {
    sqliteDb.run(
      `INSERT INTO customers (id, name, phone, email, address, credit_limit, current_debt, loyalty_points, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cus.id ?? null, cus.name, cus.phone ?? null, cus.email ?? null, cus.address ?? null, cus.credit_limit ?? 0, cus.current_debt ?? 0, cus.loyalty_points ?? 0, cus.synced ?? 1]
    );
  }

  // Insert Products
  for (const p of products) {
    sqliteDb.run(
      `INSERT INTO products (id, name, reference, barcode, category_id, purchase_price, selling_price, stock_quantity, min_stock, unit, image, is_active, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id ?? null, p.name, p.reference, p.barcode, p.category_id ?? null, p.purchase_price ?? 0, p.selling_price ?? 0, p.stock_quantity ?? 0, p.min_stock ?? 0, p.unit ?? 'pièce', p.image ?? null, p.is_active ? 1 : 0, p.synced ?? 1]
    );
  }

  // Insert Cash Sessions
  for (const cs of cashSessions) {
    sqliteDb.run(
      `INSERT INTO cash_sessions (id, cash_register_id, user_id, opening_amount, closing_amount, expected_closing_amount, status, opened_at, closed_at, notes, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cs.id ?? null, cs.cash_register_id, cs.user_id, cs.opening_amount ?? 0, cs.closing_amount ?? null, cs.expected_closing_amount ?? null, cs.status, cs.opened_at, cs.closed_at ?? null, cs.notes ?? null, cs.synced ?? 1]
    );
  }

  // Insert Cash Movements
  for (const cm of cashMovements) {
    sqliteDb.run(
      `INSERT INTO cash_movements (id, cash_session_id, type, amount, reason, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cm.id ?? null, cm.cash_session_id, cm.type, cm.amount ?? 0, cm.reason ?? '', cm.created_at, cm.synced ?? 1]
    );
  }

  // Insert Sales
  for (const s of sales) {
    sqliteDb.run(
      `INSERT INTO sales (id, invoice_number, user_id, customer_id, cash_session_id, subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount, payment_method, payment_status, notes, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id ?? null, s.invoice_number, s.user_id, s.customer_id ?? null, s.cash_session_id ?? null, s.subtotal ?? 0, s.discount_amount ?? 0, s.tax_amount ?? 0, s.total_amount ?? 0, s.paid_amount ?? 0, s.change_amount ?? 0, s.payment_method, s.payment_status, s.notes ?? null, s.created_at, s.synced ?? 1]
    );
  }

  // Insert Sale Items
  for (const si of saleItems) {
    sqliteDb.run(
      `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [si.id ?? null, si.sale_id, si.product_id, si.product_name, si.quantity, si.unit_price, si.subtotal, si.synced ?? 1]
    );
  }

  // Insert Stock Movements
  for (const sm of stockMovements) {
    sqliteDb.run(
      `INSERT INTO stock_movements (id, product_id, type, quantity, reference, reason, user_id, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sm.id ?? null, sm.product_id, sm.type, sm.quantity, sm.reference, sm.reason, sm.user_id, sm.created_at, sm.synced ?? 1]
    );
  }

  // Insert Deliveries
  for (const d of deliveries) {
    sqliteDb.run(
      `INSERT INTO deliveries (id, sale_id, customer_name, customer_phone, delivery_address, livreur_id, status, otp_code, notes, created_at, delivered_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id ?? null, d.sale_id, d.customer_name, d.customer_phone, d.delivery_address, d.livreur_id ?? null, d.status, d.otp_code, d.notes ?? null, d.created_at, d.delivered_at ?? null, d.synced ?? 1]
    );
  }

  // Insert Expenses
  for (const e of expenses) {
    sqliteDb.run(
      `INSERT INTO expenses (id, title, category, amount, payment_method, notes, user_id, date, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id ?? null, e.title, e.category, e.amount, e.payment_method, e.notes ?? null, e.user_id, e.date, e.synced ?? 1]
    );
  }

  // Insert Inventories
  for (const inv of inventories) {
    sqliteDb.run(
      `INSERT INTO inventories (id, reference, status, user_id, date, notes, synced) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [inv.id ?? null, inv.reference, inv.status, inv.user_id, inv.date, inv.notes ?? null, inv.synced ?? 1]
    );
  }

  // Insert Inventory Items
  for (const ii of inventoryItems) {
    sqliteDb.run(
      `INSERT INTO inventory_items (id, inventory_id, product_id, theoretical_quantity, real_quantity, difference, cost_variance, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ii.id ?? null, ii.inventory_id, ii.product_id, ii.theoretical_quantity, ii.real_quantity, ii.difference, ii.cost_variance, ii.synced ?? 1]
    );
  }

  // Insert Purchases
  for (const pu of purchases) {
    sqliteDb.run(
      `INSERT INTO purchases (id, reference, supplier_id, total_amount, status, received_at, user_id, notes, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pu.id ?? null, pu.reference, pu.supplier_id, pu.total_amount, pu.status, pu.received_at ?? null, pu.user_id, pu.notes ?? null, pu.created_at, pu.synced ?? 1]
    );
  }

  // Insert Purchase Items
  for (const pi of purchaseItems) {
    sqliteDb.run(
      `INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_price, subtotal, synced) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pi.id ?? null, pi.purchase_id, pi.product_id, pi.quantity, pi.unit_price, pi.subtotal, pi.synced ?? 1]
    );
  }

  const binaryArray = sqliteDb.export();
  sqliteDb.close();
  return binaryArray;
}

export async function downloadSQLiteDatabase(filename = 'gestmagasin_local.sqlite') {
  const binary = await exportIndexedDBToSQLite();
  const blob = new Blob([binary as unknown as BlobPart], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
