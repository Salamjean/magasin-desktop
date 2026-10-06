import { pool } from '../../config/db.js';
export const getAllCashRegisters = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM cash_registers ORDER BY id ASC');
        return res.json({ success: true, count: rows.length, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const createCashRegister = async (req, res) => {
    const { name, code, notes, is_active } = req.body;
    if (!name || !code)
        return res.status(400).json({ success: false, message: 'Nom et code requis' });
    try {
        const [result] = await pool.execute('INSERT INTO cash_registers (name, code, notes, is_active) VALUES (?, ?, ?, ?)', [name, code, notes || null, is_active === false ? 0 : 1]);
        return res.status(201).json({ success: true, message: 'Caisse créée', id: result.insertId });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const updateCashRegister = async (req, res) => {
    const { id } = req.params;
    const { name, code, notes, is_active } = req.body;
    try {
        await pool.execute('UPDATE cash_registers SET name = ?, code = ?, notes = ?, is_active = ? WHERE id = ?', [name, code, notes || null, is_active ? 1 : 0, id]);
        return res.json({ success: true, message: 'Caisse mise à jour' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
