import { Request, Response } from 'express';
import { pool } from '../../config/db.js';
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.execute('SELECT id, name, email, role, phone, active, created_at FROM users ORDER BY id ASC');
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, role, phone, active } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Nom, email et mot de passe requis' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await pool.execute(
      'INSERT INTO users (name, email, password, role, phone, active, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [name, email, hashedPassword, role || 'caissier', phone || null, active === false ? 0 : 1]
    );

    return res.status(201).json({ success: true, message: 'Utilisateur créé', id: result.insertId });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, password, role, phone, active } = req.body;

  try {
    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      await pool.execute(
        'UPDATE users SET name = ?, email = ?, password = ?, role = ?, phone = ?, active = ? WHERE id = ?',
        [name, email, hashedPassword, role, phone || null, active ? 1 : 0, id]
      );
    } else {
      await pool.execute(
        'UPDATE users SET name = ?, email = ?, role = ?, phone = ?, active = ? WHERE id = ?',
        [name, email, role, phone || null, active ? 1 : 0, id]
      );
    }

    return res.json({ success: true, message: 'Utilisateur mis à jour' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
