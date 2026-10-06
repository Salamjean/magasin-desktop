import { pool } from '../../config/db.js';
export const getStockMovements = async (req, res) => {
    try {
        const { type, product_id } = req.query;
        let query = `
      SELECT sm.*, p.name as product_name, p.reference as product_reference, p.unit as product_unit, u.name as user_name 
      FROM stock_movements sm 
      LEFT JOIN products p ON sm.product_id = p.id 
      LEFT JOIN users u ON sm.user_id = u.id 
      WHERE 1=1
    `;
        const params = [];
        if (type) {
            query += ' AND sm.type = ?';
            params.push(type);
        }
        if (product_id) {
            query += ' AND sm.product_id = ?';
            params.push(Number(product_id));
        }
        query += ' ORDER BY sm.created_at DESC';
        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, count: rows.length, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const createStockMovement = async (req, res) => {
    const { product_id, type, quantity, reason } = req.body;
    const userId = req.user?.id || 1;
    if (!product_id || !type || quantity === undefined) {
        return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [prods] = await conn.execute('SELECT * FROM products WHERE id = ? FOR UPDATE', [product_id]);
        if (!prods || prods.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Produit introuvable' });
        }
        const prod = prods[0];
        let newStock = prod.stock_quantity;
        if (type === 'in') {
            newStock += Number(quantity);
        }
        else if (type === 'out') {
            if (prod.stock_quantity < quantity) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: 'Stock insuffisant pour cette sortie' });
            }
            newStock -= Number(quantity);
        }
        else if (type === 'adjustment') {
            newStock = Number(quantity);
        }
        await conn.execute('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, product_id]);
        const ref = `MVT-${Date.now().toString().slice(-6)}`;
        await conn.execute('INSERT INTO stock_movements (product_id, type, quantity, reference, reason, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [product_id, type, Number(quantity), ref, reason || 'Mouvement manuel', userId]);
        await conn.commit();
        return res.status(201).json({ success: true, message: 'Mouvement de stock enregistré', newStock });
    }
    catch (err) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: err.message });
    }
    finally {
        conn.release();
    }
};
