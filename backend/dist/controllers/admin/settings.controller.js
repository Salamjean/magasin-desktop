import { pool } from '../../config/db.js';
export const getSettings = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT `key`, `value` FROM settings');
        const settingsMap = {};
        rows.forEach((r) => {
            settingsMap[r.key] = r.value;
        });
        return res.json({ success: true, settings: settingsMap });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const updateSettings = async (req, res) => {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, message: 'Format de paramètres invalide' });
    }
    try {
        for (const [key, value] of Object.entries(settings)) {
            await pool.execute('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [key, String(value), String(value)]);
        }
        return res.json({ success: true, message: 'Paramètres mis à jour avec succès' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
