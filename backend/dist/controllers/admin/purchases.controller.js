import { pool } from '../../config/db.js';
export const getAllPurchases = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT p.*, s.name as supplier_name, u.name as user_name 
      FROM purchases p 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      LEFT JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `);
        return res.json({ success: true, count: rows.length, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const createPurchase = async (req, res) => {
    const { supplier_id, items, notes } = req.body;
    const userId = req.user?.id || 1;
    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Fournisseur et articles requis' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const ref = `CMD-${Date.now().toString().slice(-6)}`;
        let totalAmount = 0;
        for (const it of items) {
            totalAmount += Number(it.quantity) * Number(it.unit_price);
        }
        const [pRes] = await conn.execute('INSERT INTO purchases (reference, supplier_id, total_amount, status, user_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [ref, supplier_id, totalAmount, 'ordered', userId, notes || null]);
        const purchaseId = pRes.insertId;
        for (const it of items) {
            const lineSub = Number(it.quantity) * Number(it.unit_price);
            await conn.execute('INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)', [purchaseId, it.product_id, it.quantity, it.unit_price, lineSub]);
        }
        await conn.commit();
        return res.status(201).json({ success: true, message: 'Commande créée', purchaseId, reference: ref });
    }
    catch (err) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: err.message });
    }
    finally {
        conn.release();
    }
};
export const receivePurchase = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id || 1;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [purchases] = await conn.execute('SELECT * FROM purchases WHERE id = ?', [id]);
        if (!purchases || purchases.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Commande introuvable' });
        }
        const purchase = purchases[0];
        if (purchase.status === 'received') {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Commande déjà réceptionnée' });
        }
        const [items] = await conn.execute('SELECT * FROM purchase_items WHERE purchase_id = ?', [id]);
        for (const it of items) {
            // Add stock
            await conn.execute('UPDATE products SET stock_quantity = stock_quantity + ?, purchase_price = ? WHERE id = ?', [it.quantity, it.unit_price, it.product_id]);
            // Add movement log
            await conn.execute('INSERT INTO stock_movements (product_id, type, quantity, reference, reason, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [it.product_id, 'in', it.quantity, purchase.reference, `Réception Bon Commande ${purchase.reference}`, userId]);
        }
        await conn.execute('UPDATE purchases SET status = ?, received_at = NOW() WHERE id = ?', ['received', id]);
        await conn.commit();
        return res.json({ success: true, message: 'Marchandises réceptionnées et stock mis à jour' });
    }
    catch (err) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: err.message });
    }
    finally {
        conn.release();
    }
};
