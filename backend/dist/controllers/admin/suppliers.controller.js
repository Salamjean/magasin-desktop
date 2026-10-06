import { pool } from '../../config/db.js';
export const getAllSuppliers = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM suppliers ORDER BY name ASC');
        return res.json({ success: true, count: rows.length, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const createSupplier = async (req, res) => {
    const { name, contact_name, email, phone, address, tax_number, notes } = req.body;
    if (!name)
        return res.status(400).json({ success: false, message: 'La raison sociale est requise' });
    try {
        const [result] = await pool.execute('INSERT INTO suppliers (name, contact_name, email, phone, address, tax_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, contact_name || '', email || '', phone || '', address || '', tax_number || '', notes || '']);
        return res.status(201).json({ success: true, message: 'Fournisseur créé', id: result.insertId });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const updateSupplier = async (req, res) => {
    const { id } = req.params;
    const { name, contact_name, email, phone, address, tax_number, notes } = req.body;
    try {
        await pool.execute('UPDATE suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, address = ?, tax_number = ?, notes = ? WHERE id = ?', [name, contact_name || '', email || '', phone || '', address || '', tax_number || '', notes || '', id]);
        return res.json({ success: true, message: 'Fournisseur mis à jour' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const deleteSupplier = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM suppliers WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Fournisseur supprimé' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
