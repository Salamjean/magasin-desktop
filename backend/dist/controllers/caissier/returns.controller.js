import { pool } from '../../config/db.js';
export const findSaleByInvoice = async (req, res) => {
    const { invoice_number } = req.query;
    if (!invoice_number)
        return res.status(400).json({ success: false, message: 'N° de facture requis' });
    try {
        const [sales] = await pool.execute('SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.invoice_number = ?', [invoice_number]);
        if (!sales || sales.length === 0) {
            return res.status(404).json({ success: false, message: 'Facture introuvable' });
        }
        const [items] = await pool.execute('SELECT * FROM sale_items WHERE sale_id = ?', [sales[0].id]);
        return res.json({ success: true, sale: sales[0], items });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const processReturn = async (req, res) => {
    const { sale_id, invoice_number, items } = req.body;
    const userId = req.user?.id || 1;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Aucun article à retourner' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        let totalRefund = 0;
        for (const it of items) {
            const refund = Number(it.quantity) * Number(it.unit_price);
            totalRefund += refund;
            // Re-add stock
            await conn.execute('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [
                it.quantity,
                it.product_id
            ]);
            // Stock movement log
            await conn.execute('INSERT INTO stock_movements (product_id, type, quantity, reference, reason, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [
                it.product_id,
                'in',
                it.quantity,
                invoice_number || 'RETOUR',
                `Retour Client Facture #${invoice_number}`,
                userId
            ]);
        }
        await conn.commit();
        return res.json({
            success: true,
            message: 'Retour enregistré et stock réintégré',
            totalRefund
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
