import { pool } from '../../config/db.js';
export const getActiveSession = async (req, res) => {
    const userId = req.user?.id;
    try {
        const [rows] = await pool.execute(`SELECT cs.*, cr.name as register_name, cr.code as register_code 
       FROM cash_sessions cs 
       LEFT JOIN cash_registers cr ON cs.cash_register_id = cr.id 
       WHERE cs.user_id = ? AND cs.status = 'open' 
       ORDER BY cs.opened_at DESC LIMIT 1`, [userId]);
        if (!rows || rows.length === 0) {
            return res.json({ success: true, activeSession: null });
        }
        const session = rows[0];
        const [movements] = await pool.execute('SELECT * FROM cash_movements WHERE cash_session_id = ? ORDER BY created_at DESC', [session.id]);
        return res.json({ success: true, activeSession: session, movements });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const openSession = async (req, res) => {
    const { cash_register_id, opening_amount } = req.body;
    const userId = req.user?.id || 1;
    if (!cash_register_id) {
        return res.status(400).json({ success: false, message: 'Caisse obligatoire' });
    }
    try {
        const [existing] = await pool.execute("SELECT id FROM cash_sessions WHERE user_id = ? AND status = 'open' LIMIT 1", [userId]);
        if (existing && existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Une session est déjà ouverte pour votre compte' });
        }
        const [result] = await pool.execute('INSERT INTO cash_sessions (cash_register_id, user_id, opening_amount, status, opened_at) VALUES (?, ?, ?, ?, NOW())', [cash_register_id, userId, Number(opening_amount) || 0, 'open']);
        return res.status(201).json({ success: true, message: 'Session de caisse ouverte', sessionId: result.insertId });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const addMovement = async (req, res) => {
    const { cash_session_id, type, amount, reason } = req.body;
    if (!cash_session_id || !type || !amount) {
        return res.status(400).json({ success: false, message: 'Données incomplètes' });
    }
    try {
        await pool.execute('INSERT INTO cash_movements (cash_session_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, NOW())', [cash_session_id, type, Number(amount), reason || 'Mouvement manuel']);
        return res.json({ success: true, message: 'Mouvement de caisse enregistré' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const closeSession = async (req, res) => {
    const { id } = req.params;
    const { closing_amount, expected_closing_amount, notes } = req.body;
    try {
        await pool.execute(`UPDATE cash_sessions 
       SET status = 'closed', closing_amount = ?, expected_closing_amount = ?, closed_at = NOW(), notes = ? 
       WHERE id = ?`, [Number(closing_amount), Number(expected_closing_amount), notes || null, id]);
        return res.json({ success: true, message: 'Session de caisse clôturée avec succès' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
