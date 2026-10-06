import { pool } from '../../config/db.js';
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
