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
export const deleteCashRegister = async (req, res) => {
    const { id } = req.params;
    try {
        // Vérifier si des ventes existent sur les sessions de cette caisse
        const [sales] = await pool.execute(`SELECT s.id FROM sales s
       INNER JOIN cash_sessions cs ON s.cash_session_id = cs.id
       WHERE cs.cash_register_id = ?
       LIMIT 1`, [id]);
        if (sales && sales.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer cette caisse car elle a déjà été utilisée pour enregistrer des ventes. Vous pouvez uniquement la désactiver.'
            });
        }
        // Supprimer les sessions vides associées s'il y en a
        await pool.execute('DELETE FROM cash_sessions WHERE cash_register_id = ?', [id]);
        // Supprimer le poste de caisse
        await pool.execute('DELETE FROM cash_registers WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Poste de caisse supprimé avec succès' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
