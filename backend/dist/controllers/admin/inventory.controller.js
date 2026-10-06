import { pool } from '../../config/db.js';
export const getAllInventories = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT i.*, u.name as user_name 
      FROM inventories i 
      LEFT JOIN users u ON i.user_id = u.id 
      ORDER BY i.date DESC
    `);
        return res.json({ success: true, count: rows.length, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const getInventoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const [invs] = await pool.execute('SELECT i.*, u.name as user_name FROM inventories i LEFT JOIN users u ON i.user_id = u.id WHERE i.id = ?', [id]);
        if (!invs || invs.length === 0) {
            return res.status(404).json({ success: false, message: 'Inventaire introuvable' });
        }
        const [items] = await pool.execute(`SELECT ii.*, p.name as product_name, p.reference as product_reference, p.unit as product_unit 
       FROM inventory_items ii 
       LEFT JOIN products p ON ii.product_id = p.id 
       WHERE ii.inventory_id = ?`, [id]);
        return res.json({ success: true, inventory: invs[0], items });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const validateInventory = async (req, res) => {
    const { items, notes } = req.body;
    const userId = req.user?.id || 1;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Feuille d\'inventaire vide' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const ref = `INV-${Date.now().toString().slice(-6)}`;
        const [invRes] = await conn.execute('INSERT INTO inventories (reference, status, user_id, date, notes) VALUES (?, ?, ?, NOW(), ?)', [ref, 'validated', userId, notes || null]);
        const invId = invRes.insertId;
        for (const it of items) {
            const diff = Number(it.real_quantity) - Number(it.theoretical_quantity);
            const costVariance = diff * (Number(it.purchase_price) || 0);
            await conn.execute(`INSERT INTO inventory_items 
         (inventory_id, product_id, theoretical_quantity, real_quantity, difference, cost_variance) 
         VALUES (?, ?, ?, ?, ?, ?)`, [invId, it.product_id, it.theoretical_quantity, it.real_quantity, diff, costVariance]);
            // Adjust stock quantity in products
            if (diff !== 0) {
                await conn.execute('UPDATE products SET stock_quantity = ? WHERE id = ?', [
                    it.real_quantity,
                    it.product_id
                ]);
                await conn.execute('INSERT INTO stock_movements (product_id, type, quantity, reference, reason, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [
                    it.product_id,
                    'adjustment',
                    it.real_quantity,
                    ref,
                    `Inventaire physique ${ref} (Écart: ${diff > 0 ? '+' : ''}${diff})`,
                    userId
                ]);
            }
        }
        await conn.commit();
        return res.status(201).json({
            success: true,
            message: 'Inventaire validé et stocks mis à jour',
            inventoryId: invId,
            reference: ref
        });
    }
    catch (err) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: err.message });
    }
    finally {
        conn.release();
    }
};
