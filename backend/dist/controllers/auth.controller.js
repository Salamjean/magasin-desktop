import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Veuillez renseigner un email et un mot de passe' });
    }
    try {
        const [rows] = await pool.execute('SELECT id, name, email, password, role, active FROM users WHERE email = ? LIMIT 1', [email]);
        if (!rows || rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides' });
        }
        const user = rows[0];
        if (!user.active) {
            return res.status(403).json({ success: false, message: 'Ce compte utilisateur a été désactivé' });
        }
        // Check bcrypt hash or direct match
        const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
        const isDirectMatch = user.password === password;
        if (!isMatch && !isDirectMatch) {
            return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
        }
        const secret = process.env.JWT_SECRET || 'gestmagasin_secret_jwt_key_2026';
        const token = jwt.sign({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        }, secret, { expiresIn: '7d' });
        return res.json({
            success: true,
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};
export const getProfile = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, name, email, role, phone, active, created_at FROM users WHERE id = ? LIMIT 1', [req.user?.id]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }
        return res.json({ success: true, user: rows[0] });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
export const updateProfile = async (req, res) => {
    const { name, phone, password } = req.body;
    const userId = req.user?.id;
    try {
        if (password && password.trim()) {
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            await pool.execute('UPDATE users SET name = ?, phone = ?, password = ? WHERE id = ?', [name, phone || null, hashedPassword, userId]);
        }
        else {
            await pool.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, userId]);
        }
        return res.json({ success: true, message: 'Profil mis à jour avec succès' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
