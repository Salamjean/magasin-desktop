import { pool } from '../../config/db.js';
import bcrypt from 'bcryptjs';
function toMySQLDateTime(dateStr) {
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
    }
    catch {
        const now = new Date();
        return now.toISOString().slice(0, 19).replace('T', ' ');
    }
}
function toMySQLDate(dateStr) {
    if (!dateStr) {
        return new Date().toISOString().slice(0, 10);
    }
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            return new Date().toISOString().slice(0, 10);
        }
        return d.toISOString().slice(0, 10);
    }
    catch {
        return new Date().toISOString().slice(0, 10);
    }
}
// Récupération complète de toutes les tables MySQL (PULL)
export const syncPullAll = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT * FROM users');
        const [settings] = await pool.query('SELECT * FROM settings');
        const [cashRegisters] = await pool.query('SELECT * FROM cash_registers');
        const [categories] = await pool.query('SELECT * FROM categories');
        const [suppliers] = await pool.query('SELECT * FROM suppliers');
        const [customers] = await pool.query('SELECT * FROM customers');
        const [products] = await pool.query('SELECT * FROM products');
        const [sales] = await pool.query('SELECT * FROM sales ORDER BY id DESC');
        const [saleItems] = await pool.query('SELECT * FROM sale_items');
        const [cashSessions] = await pool.query('SELECT * FROM cash_sessions ORDER BY id DESC');
        const [cashMovements] = await pool.query('SELECT * FROM cash_movements ORDER BY id DESC');
        const [stockMovements] = await pool.query('SELECT * FROM stock_movements ORDER BY id DESC');
        const [expenses] = await pool.query('SELECT * FROM expenses ORDER BY id DESC');
        const [purchases] = await pool.query('SELECT * FROM purchases ORDER BY id DESC');
        const [purchaseItems] = await pool.query('SELECT * FROM purchase_items');
        const [inventories] = await pool.query('SELECT * FROM inventories ORDER BY id DESC');
        const [inventoryItems] = await pool.query('SELECT * FROM inventory_items');
        const [deliveries] = await pool.query('SELECT * FROM deliveries ORDER BY id DESC');
        return res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                users,
                settings,
                cash_registers: cashRegisters,
                categories,
                suppliers,
                customers,
                products,
                sales,
                sale_items: saleItems,
                cash_sessions: cashSessions,
                cash_movements: cashMovements,
                stock_movements: stockMovements,
                expenses,
                purchases,
                purchase_items: purchaseItems,
                inventories,
                inventory_items: inventoryItems,
                deliveries
            }
        });
    }
    catch (err) {
        console.error('Erreur syncPullAll:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
// Envoi et enregistrement des modifications locales vers MySQL (PUSH)
export const syncPush = async (req, res) => {
    const { tables } = req.body;
    if (!tables || typeof tables !== 'object') {
        return res.status(400).json({ success: false, message: 'Payload tables requis' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // 0. Users (Mots de passe sécurisés avec hash bcrypt)
        if (tables.users && Array.isArray(tables.users)) {
            for (const u of tables.users) {
                const isActive = u.active === false || u.active === 0 || u.active === '0' || u.active === 'false' ? 0 : 1;
                let passwordToStore = u.password || 'password123';
                if (passwordToStore && !passwordToStore.startsWith('$2a$') && !passwordToStore.startsWith('$2b$')) {
                    passwordToStore = await bcrypt.hash(passwordToStore, 10);
                }
                if (u.id) {
                    await conn.execute(`INSERT INTO users (id, name, email, password, role, phone, avatar, active, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), password = VALUES(password), role = VALUES(role), phone = VALUES(phone), avatar = VALUES(avatar), active = VALUES(active), synced = 1`, [u.id, u.name, u.email, passwordToStore, u.role || 'caissier', u.phone || null, u.avatar || null, isActive]);
                }
                else {
                    await conn.execute(`INSERT INTO users (name, email, password, role, phone, avatar, active, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), phone = VALUES(phone), avatar = VALUES(avatar), active = VALUES(active), synced = 1`, [u.name, u.email, passwordToStore, u.role || 'caissier', u.phone || null, u.avatar || null, isActive]);
                }
            }
        }
        // 1. Settings
        if (tables.settings && Array.isArray(tables.settings)) {
            for (const s of tables.settings) {
                if (s.key) {
                    await conn.execute('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [s.key, String(s.value || '')]);
                }
            }
        }
        // 2. Cash Registers
        if (tables.cash_registers && Array.isArray(tables.cash_registers)) {
            for (const cr of tables.cash_registers) {
                const isActive = cr.is_active === false || cr.is_active === 0 || cr.is_active === '0' || cr.is_active === 'false' ? 0 : 1;
                if (cr.id) {
                    await conn.execute('INSERT INTO cash_registers (id, name, code, is_active, notes, synced) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code), is_active = VALUES(is_active), notes = VALUES(notes), synced = 1', [cr.id, cr.name, cr.code, isActive, cr.notes || null]);
                }
                else {
                    await conn.execute('INSERT INTO cash_registers (name, code, is_active, notes, synced) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active), notes = VALUES(notes), synced = 1', [cr.name, cr.code, isActive, cr.notes || null]);
                }
            }
        }
        // 3. Categories
        if (tables.categories && Array.isArray(tables.categories)) {
            for (const cat of tables.categories) {
                if (cat.id) {
                    await conn.execute('INSERT INTO categories (id, name, description, icon, color, synced) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), icon = VALUES(icon), color = VALUES(color), synced = 1', [cat.id, cat.name, cat.description || null, cat.icon || 'Package', cat.color || '#0284c7']);
                }
                else {
                    await conn.execute('INSERT INTO categories (name, description, icon, color, synced) VALUES (?, ?, ?, ?, 1)', [cat.name, cat.description || null, cat.icon || 'Package', cat.color || '#0284c7']);
                }
            }
        }
        // 4. Suppliers
        if (tables.suppliers && Array.isArray(tables.suppliers)) {
            for (const sup of tables.suppliers) {
                if (sup.id) {
                    await conn.execute(`INSERT INTO suppliers (id, name, contact_name, email, phone, address, tax_number, notes, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE name = VALUES(name), contact_name = VALUES(contact_name), email = VALUES(email), phone = VALUES(phone), address = VALUES(address), tax_number = VALUES(tax_number), notes = VALUES(notes), synced = 1`, [sup.id, sup.name, sup.contact_name || null, sup.email || null, sup.phone || null, sup.address || null, sup.tax_number || null, sup.notes || null]);
                }
                else {
                    await conn.execute(`INSERT INTO suppliers (name, contact_name, email, phone, address, tax_number, notes, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, [sup.name, sup.contact_name || null, sup.email || null, sup.phone || null, sup.address || null, sup.tax_number || null, sup.notes || null]);
                }
            }
        }
        // 5. Customers
        if (tables.customers && Array.isArray(tables.customers)) {
            for (const c of tables.customers) {
                if (c.id) {
                    await conn.execute(`INSERT INTO customers (id, name, phone, email, address, credit_limit, current_debt, loyalty_points, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), email = VALUES(email), address = VALUES(address), credit_limit = VALUES(credit_limit), current_debt = VALUES(current_debt), loyalty_points = VALUES(loyalty_points), synced = 1`, [c.id, c.name, c.phone || null, c.email || null, c.address || null, c.credit_limit || 0, c.current_debt || 0, c.loyalty_points || 0]);
                }
                else {
                    await conn.execute(`INSERT INTO customers (name, phone, email, address, credit_limit, current_debt, loyalty_points, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, [c.name, c.phone || null, c.email || null, c.address || null, c.credit_limit || 0, c.current_debt || 0, c.loyalty_points || 0]);
                }
            }
        }
        // 6. Products
        if (tables.products && Array.isArray(tables.products)) {
            for (const p of tables.products) {
                const isActive = p.is_active === false || p.is_active === 0 || p.is_active === '0' || p.is_active === 'false' ? 0 : 1;
                if (p.id) {
                    await conn.execute(`INSERT INTO products (id, name, reference, barcode, category_id, purchase_price, selling_price, stock_quantity, min_stock, unit, image, is_active, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE name = VALUES(name), reference = VALUES(reference), barcode = VALUES(barcode), category_id = VALUES(category_id), purchase_price = VALUES(purchase_price), selling_price = VALUES(selling_price), stock_quantity = VALUES(stock_quantity), min_stock = VALUES(min_stock), unit = VALUES(unit), image = VALUES(image), is_active = VALUES(is_active), synced = 1`, [p.id, p.name, p.reference, p.barcode, p.category_id || null, p.purchase_price || 0, p.selling_price || 0, p.stock_quantity || 0, p.min_stock || 5, p.unit || 'pièce', p.image || null, isActive]);
                }
                else {
                    await conn.execute(`INSERT INTO products (name, reference, barcode, category_id, purchase_price, selling_price, stock_quantity, min_stock, unit, image, is_active, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [p.name, p.reference, p.barcode, p.category_id || null, p.purchase_price || 0, p.selling_price || 0, p.stock_quantity || 0, p.min_stock || 5, p.unit || 'pièce', p.image || null, isActive]);
                }
            }
        }
        // 7. Cash Sessions
        if (tables.cash_sessions && Array.isArray(tables.cash_sessions)) {
            for (const cs of tables.cash_sessions) {
                const openedAt = toMySQLDateTime(cs.opened_at);
                const closedAt = cs.closed_at ? toMySQLDateTime(cs.closed_at) : null;
                if (cs.id) {
                    await conn.execute(`INSERT INTO cash_sessions (id, cash_register_id, user_id, opening_amount, closing_amount, expected_closing_amount, status, opened_at, closed_at, notes, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE closing_amount = VALUES(closing_amount), expected_closing_amount = VALUES(expected_closing_amount), status = VALUES(status), closed_at = VALUES(closed_at), notes = VALUES(notes), synced = 1`, [cs.id, cs.cash_register_id || 1, cs.user_id || 1, cs.opening_amount || 0, cs.closing_amount ?? null, cs.expected_closing_amount ?? null, cs.status || 'open', openedAt, closedAt, cs.notes || null]);
                }
                else {
                    await conn.execute(`INSERT INTO cash_sessions (cash_register_id, user_id, opening_amount, closing_amount, expected_closing_amount, status, opened_at, closed_at, notes, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [cs.cash_register_id || 1, cs.user_id || 1, cs.opening_amount || 0, cs.closing_amount ?? null, cs.expected_closing_amount ?? null, cs.status || 'open', openedAt, closedAt, cs.notes || null]);
                }
            }
        }
        // 8. Cash Movements
        if (tables.cash_movements && Array.isArray(tables.cash_movements)) {
            for (const cm of tables.cash_movements) {
                const mvtDate = toMySQLDateTime(cm.created_at);
                if (cm.id) {
                    await conn.execute(`INSERT INTO cash_movements (id, cash_session_id, type, amount, reason, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE amount = VALUES(amount), reason = VALUES(reason), synced = 1`, [cm.id, cm.cash_session_id, cm.type, cm.amount, cm.reason || null, mvtDate]);
                }
                else {
                    await conn.execute(`INSERT INTO cash_movements (cash_session_id, type, amount, reason, created_at, synced)
             VALUES (?, ?, ?, ?, ?, 1)`, [cm.cash_session_id, cm.type, cm.amount, cm.reason || null, mvtDate]);
                }
            }
        }
        // 9. Sales & Sale Items
        if (tables.sales && Array.isArray(tables.sales)) {
            for (const s of tables.sales) {
                const subtotal = s.subtotal || s.total_amount || 0;
                const totalAmount = s.total_amount || s.final_amount || subtotal;
                const saleDate = toMySQLDateTime(s.created_at);
                if (s.id) {
                    await conn.execute(`INSERT INTO sales (id, invoice_number, user_id, customer_id, cash_session_id, subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount, payment_method, payment_status, notes, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE paid_amount = VALUES(paid_amount), change_amount = VALUES(change_amount), payment_status = VALUES(payment_status), notes = VALUES(notes), synced = 1`, [s.id, s.invoice_number, s.user_id || 1, s.customer_id || null, s.cash_session_id || null, subtotal, s.discount_amount || 0, s.tax_amount || 0, totalAmount, s.paid_amount || 0, s.change_amount || 0, s.payment_method || 'cash', s.payment_status || 'paid', s.notes || null, saleDate]);
                }
                else {
                    await conn.execute(`INSERT INTO sales (invoice_number, user_id, customer_id, cash_session_id, subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount, payment_method, payment_status, notes, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [s.invoice_number, s.user_id || 1, s.customer_id || null, s.cash_session_id || null, subtotal, s.discount_amount || 0, s.tax_amount || 0, totalAmount, s.paid_amount || 0, s.change_amount || 0, s.payment_method || 'cash', s.payment_status || 'paid', s.notes || null, saleDate]);
                }
            }
        }
        if (tables.sale_items && Array.isArray(tables.sale_items)) {
            for (const item of tables.sale_items) {
                const subtotal = item.subtotal || item.total_price || ((item.quantity || 1) * (item.unit_price || 0));
                if (item.id) {
                    await conn.execute(`INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), unit_price = VALUES(unit_price), subtotal = VALUES(subtotal), synced = 1`, [item.id, item.sale_id, item.product_id, item.product_name, item.quantity || 1, item.unit_price || 0, subtotal]);
                }
                else {
                    await conn.execute(`INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal, synced)
             VALUES (?, ?, ?, ?, ?, ?, 1)`, [item.sale_id, item.product_id, item.product_name, item.quantity || 1, item.unit_price || 0, subtotal]);
                }
            }
        }
        // 10. Stock Movements
        if (tables.stock_movements && Array.isArray(tables.stock_movements)) {
            for (const sm of tables.stock_movements) {
                const moveDate = toMySQLDateTime(sm.created_at);
                if (sm.id) {
                    await conn.execute(`INSERT INTO stock_movements (id, product_id, type, quantity, reference, reason, user_id, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), reason = VALUES(reason), synced = 1`, [sm.id, sm.product_id, sm.type || 'adjustment', sm.quantity, sm.reference || `MVT-${sm.id}`, sm.reason || 'Ajustement', sm.user_id || 1, moveDate]);
                }
                else {
                    await conn.execute(`INSERT INTO stock_movements (product_id, type, quantity, reference, reason, user_id, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, [sm.product_id, sm.type || 'adjustment', sm.quantity, sm.reference || `MVT-${Date.now()}`, sm.reason || 'Ajustement', sm.user_id || 1, moveDate]);
                }
            }
        }
        // 11. Expenses
        if (tables.expenses && Array.isArray(tables.expenses)) {
            for (const exp of tables.expenses) {
                const expDate = toMySQLDate(exp.date);
                if (exp.id) {
                    await conn.execute(`INSERT INTO expenses (id, title, category, amount, payment_method, notes, user_id, date, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE title = VALUES(title), amount = VALUES(amount), category = VALUES(category), payment_method = VALUES(payment_method), notes = VALUES(notes), date = VALUES(date), synced = 1`, [exp.id, exp.title, exp.category || 'Général', exp.amount || 0, exp.payment_method || 'cash', exp.notes || null, exp.user_id || 1, expDate]);
                }
                else {
                    await conn.execute(`INSERT INTO expenses (title, category, amount, payment_method, notes, user_id, date, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, [exp.title, exp.category || 'Général', exp.amount || 0, exp.payment_method || 'cash', exp.notes || null, exp.user_id || 1, expDate]);
                }
            }
        }
        // 12. Purchases & Purchase Items
        if (tables.purchases && Array.isArray(tables.purchases)) {
            for (const pur of tables.purchases) {
                const receivedAt = pur.received_at ? toMySQLDateTime(pur.received_at) : (pur.delivery_date ? toMySQLDate(pur.delivery_date) : null);
                const purDate = toMySQLDateTime(pur.created_at);
                if (pur.id) {
                    await conn.execute(`INSERT INTO purchases (id, reference, supplier_id, total_amount, status, received_at, received_by_user_id, received_by, user_id, notes, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE status = VALUES(status), total_amount = VALUES(total_amount), received_at = VALUES(received_at), received_by_user_id = VALUES(received_by_user_id), received_by = VALUES(received_by), notes = VALUES(notes), synced = 1`, [pur.id, pur.reference || `ACH-${pur.id}`, pur.supplier_id, pur.total_amount || 0, pur.status || 'ordered', receivedAt, pur.received_by_user_id || null, pur.received_by || null, pur.user_id || 1, pur.notes || null, purDate]);
                }
                else {
                    await conn.execute(`INSERT INTO purchases (reference, supplier_id, total_amount, status, received_at, received_by_user_id, received_by, user_id, notes, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [pur.reference || `ACH-${Date.now()}`, pur.supplier_id, pur.total_amount || 0, pur.status || 'ordered', receivedAt, pur.received_by_user_id || null, pur.received_by || null, pur.user_id || 1, pur.notes || null, purDate]);
                }
            }
        }
        if (tables.purchase_items && Array.isArray(tables.purchase_items)) {
            for (const pi of tables.purchase_items) {
                if (pi.id) {
                    await conn.execute(`INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_price, subtotal, synced)
             VALUES (?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), unit_price = VALUES(unit_price), subtotal = VALUES(subtotal), synced = 1`, [pi.id, pi.purchase_id, pi.product_id, pi.quantity, pi.unit_price, pi.subtotal]);
                }
                else {
                    await conn.execute(`INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, subtotal, synced)
             VALUES (?, ?, ?, ?, ?, 1)`, [pi.purchase_id, pi.product_id, pi.quantity, pi.unit_price, pi.subtotal]);
                }
            }
        }
        // 13. Inventories & Inventory Items
        if (tables.inventories && Array.isArray(tables.inventories)) {
            for (const inv of tables.inventories) {
                const invDate = toMySQLDate(inv.date);
                if (inv.id) {
                    await conn.execute(`INSERT INTO inventories (id, reference, status, user_id, date, notes, synced)
             VALUES (?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), synced = 1`, [inv.id, inv.reference || `INV-${inv.id}`, inv.status || 'draft', inv.user_id || 1, invDate, inv.notes || null]);
                }
                else {
                    await conn.execute(`INSERT INTO inventories (reference, status, user_id, date, notes, synced)
             VALUES (?, ?, ?, ?, ?, 1)`, [inv.reference || `INV-${Date.now()}`, inv.status || 'draft', inv.user_id || 1, invDate, inv.notes || null]);
                }
            }
        }
        if (tables.inventory_items && Array.isArray(tables.inventory_items)) {
            for (const ii of tables.inventory_items) {
                if (ii.id) {
                    await conn.execute(`INSERT INTO inventory_items (id, inventory_id, product_id, theoretical_quantity, real_quantity, difference, cost_variance, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE real_quantity = VALUES(real_quantity), difference = VALUES(difference), cost_variance = VALUES(cost_variance), synced = 1`, [ii.id, ii.inventory_id, ii.product_id, ii.theoretical_quantity || 0, ii.real_quantity || 0, ii.difference || 0, ii.cost_variance || 0]);
                }
                else {
                    await conn.execute(`INSERT INTO inventory_items (inventory_id, product_id, theoretical_quantity, real_quantity, difference, cost_variance, synced)
             VALUES (?, ?, ?, ?, ?, 1)`, [ii.inventory_id, ii.product_id, ii.theoretical_quantity || 0, ii.real_quantity || 0, ii.difference || 0, ii.cost_variance || 0]);
                }
            }
        }
        // 14. Deliveries
        if (tables.deliveries && Array.isArray(tables.deliveries)) {
            for (const del of tables.deliveries) {
                const livreurId = del.livreur_id || del.delivery_person_id || null;
                const delCreatedAt = toMySQLDateTime(del.created_at);
                const delDeliveredAt = del.delivered_at ? toMySQLDateTime(del.delivered_at) : null;
                const saleId = del.sale_id && Number(del.sale_id) > 0 ? Number(del.sale_id) : null;
                const customerId = del.customer_id && Number(del.customer_id) > 0 ? Number(del.customer_id) : null;
                const amountToCollect = Number(del.amount_to_collect || 0);
                const deliveryType = del.delivery_type || (saleId ? 'sale' : 'free');
                if (del.id) {
                    await conn.execute(`INSERT INTO deliveries (id, sale_id, customer_id, customer_name, customer_phone, delivery_address, amount_to_collect, livreur_id, status, otp_code, notes, items_json, delivery_type, created_at, delivered_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE sale_id = VALUES(sale_id), customer_id = VALUES(customer_id), customer_name = VALUES(customer_name), customer_phone = VALUES(customer_phone), delivery_address = VALUES(delivery_address), amount_to_collect = VALUES(amount_to_collect), status = VALUES(status), livreur_id = VALUES(livreur_id), delivered_at = VALUES(delivered_at), notes = VALUES(notes), items_json = VALUES(items_json), delivery_type = VALUES(delivery_type), synced = 1`, [del.id, saleId, customerId, del.customer_name, del.customer_phone || '', del.delivery_address, amountToCollect, livreurId, del.status || 'pending', del.otp_code || '0000', del.notes || null, del.items_json || null, deliveryType, delCreatedAt, delDeliveredAt]);
                }
                else {
                    await conn.execute(`INSERT INTO deliveries (sale_id, customer_id, customer_name, customer_phone, delivery_address, amount_to_collect, livreur_id, status, otp_code, notes, items_json, delivery_type, created_at, delivered_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [saleId, customerId, del.customer_name, del.customer_phone || '', del.delivery_address, amountToCollect, livreurId, del.status || 'pending', del.otp_code || '0000', del.notes || null, del.items_json || null, deliveryType, delCreatedAt, delDeliveredAt]);
                }
            }
        }
        await conn.commit();
        return res.json({ success: true, message: 'Synchronisation PUSH vers MySQL effectuée avec succès' });
    }
    catch (err) {
        await conn.rollback();
        console.error('Erreur syncPush:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
    finally {
        conn.release();
    }
};
export const syncBatch = async (req, res) => {
    const { operations } = req.body;
    if (!operations || !Array.isArray(operations)) {
        return res.status(400).json({ success: false, message: 'Opérations invalides' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (const op of operations) {
            await conn.execute(op.sql, op.params || []);
        }
        await conn.commit();
        return res.json({ success: true, count: operations.length, message: 'Synchronisation par lot réussie' });
    }
    catch (err) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: err.message });
    }
    finally {
        conn.release();
    }
};
export const deleteCashRegisterSync = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Vérifier si des ventes sont rattachées aux sessions de cette caisse
        const [sales] = await pool.execute(`SELECT s.id FROM sales s
       INNER JOIN cash_sessions cs ON s.cash_session_id = cs.id
       WHERE cs.cash_register_id = ?
       LIMIT 1`, [id]);
        if (sales && sales.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer cette caisse car des ventes y sont déjà associées.'
            });
        }
        // 2. Nettoyer les éventuelles sessions vides associées
        await pool.execute('DELETE FROM cash_sessions WHERE cash_register_id = ?', [id]);
        // 3. Supprimer le poste de caisse dans la table MySQL
        const [result] = await pool.execute('DELETE FROM cash_registers WHERE id = ?', [id]);
        return res.json({
            success: true,
            message: 'Poste de caisse supprimé avec succès dans MySQL',
            affectedRows: result.affectedRows
        });
    }
    catch (err) {
        console.error('Erreur suppression caisse MySQL:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const updateCashRegisterStatusSync = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    try {
        const isActive = is_active === false || is_active === 0 || is_active === '0' || is_active === 'false' ? 0 : 1;
        await pool.execute('UPDATE cash_registers SET is_active = ?, synced = 1 WHERE id = ?', [isActive, id]);
        return res.json({
            success: true,
            message: `Statut caisse #${id} mis à jour (is_active: ${isActive})`
        });
    }
    catch (err) {
        console.error('Erreur statut caisse MySQL:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const deleteDeliverySync = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT status FROM deliveries WHERE id = ?', [id]);
        if (rows && rows.length > 0 && rows[0].status === 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer une livraison déjà marquée comme livrée.'
            });
        }
        const [result] = await pool.query('DELETE FROM deliveries WHERE id = ?', [id]);
        return res.json({
            success: true,
            message: 'Livraison supprimée avec succès dans MySQL',
            affectedRows: result.affectedRows
        });
    }
    catch (err) {
        console.error('Erreur suppression livraison MySQL:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const deleteProductSync = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
        return res.json({
            success: true,
            message: 'Produit supprimé avec succès dans MySQL',
            affectedRows: result.affectedRows
        });
    }
    catch (err) {
        console.error('Erreur suppression produit MySQL:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const syncHealth = async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        return res.json({
            success: true,
            status: 'online',
            message: 'Serveur MySQL opérationnel et prêt pour la synchronisation',
            timestamp: new Date().toISOString()
        });
    }
    catch (err) {
        return res.status(503).json({
            success: false,
            status: 'offline',
            message: err.message
        });
    }
};
