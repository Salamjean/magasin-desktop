import { pool } from '../../config/db.js';
export const getAllSales = async (req, res) => {
    try {
        const { method, status, search } = req.query;
        let query = `
      SELECT s.*, c.name as customer_name, u.name as cashier_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id 
      LEFT JOIN users u ON s.user_id = u.id 
      WHERE 1=1
    `;
        const params = [];
        if (method) {
            query += ' AND s.payment_method = ?';
            params.push(method);
        }
        if (status) {
            query += ' AND s.payment_status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (s.invoice_number LIKE ? OR c.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY s.created_at DESC';
        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, count: rows.length, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const getSaleById = async (req, res) => {
    const { id } = req.params;
    try {
        const [sales] = await pool.execute(`SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, u.name as cashier_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       LEFT JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`, [id]);
        if (!sales || sales.length === 0) {
            return res.status(404).json({ success: false, message: 'Facture introuvable' });
        }
        const [items] = await pool.execute(`SELECT si.*, p.reference as product_reference, p.unit as product_unit 
       FROM sale_items si 
       LEFT JOIN products p ON si.product_id = p.id 
       WHERE si.sale_id = ?`, [id]);
        return res.json({ success: true, sale: sales[0], items });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const createSale = async (req, res) => {
    const { customer_id, cash_session_id, items, discount_amount, tax_amount, paid_amount, payment_method, notes } = req.body;
    const userId = req.user?.id || 1;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Le panier est vide' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        let subtotal = 0;
        for (const it of items) {
            subtotal += Number(it.quantity) * Number(it.unit_price);
        }
        const discount = Number(discount_amount) || 0;
        const tax = Number(tax_amount) || 0;
        const totalAmount = Math.max(0, subtotal - discount) + tax;
        const paid = Number(paid_amount) || totalAmount;
        const change = Math.max(0, paid - totalAmount);
        const invoiceNumber = `FAC-${Date.now().toString().slice(-6)}`;
        const paymentStatus = payment_method === 'credit' ? 'pending' : 'paid';
        // 1. Insert sale record
        const [saleRes] = await conn.execute(`INSERT INTO sales 
       (invoice_number, user_id, customer_id, cash_session_id, subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount, payment_method, payment_status, notes, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
            invoiceNumber,
            userId,
            customer_id || null,
            cash_session_id || null,
            subtotal,
            discount,
            tax,
            totalAmount,
            paid,
            change,
            payment_method || 'cash',
            paymentStatus,
            notes || null
        ]);
        const saleId = saleRes.insertId;
        // 2. Insert items & deduct stock
        for (const it of items) {
            const lineSubtotal = Number(it.quantity) * Number(it.unit_price);
            await conn.execute('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)', [saleId, it.product_id, it.product_name, it.quantity, it.unit_price, lineSubtotal]);
            // Deduct product stock
            await conn.execute('UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?', [it.quantity, it.product_id]);
            // Add movement
            await conn.execute('INSERT INTO stock_movements (product_id, type, quantity, reference, reason, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [it.product_id, 'out', it.quantity, invoiceNumber, `Vente caisse #${invoiceNumber}`, userId]);
        }
        // 3. Update customer debt if credit sale
        if (payment_method === 'credit' && customer_id) {
            await conn.execute('UPDATE customers SET current_debt = current_debt + ? WHERE id = ?', [totalAmount, customer_id]);
        }
        await conn.commit();
        return res.status(201).json({
            success: true,
            message: 'Vente enregistrée avec succès',
            saleId,
            invoiceNumber,
            totalAmount,
            changeAmount: change
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
