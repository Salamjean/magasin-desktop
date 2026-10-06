import { Request, Response } from 'express';
import { pool } from '../../config/db.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';

export const getAllExpenses = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    let query = 'SELECT e.*, u.name as user_name FROM expenses e LEFT JOIN users u ON e.user_id = u.id WHERE 1=1';
    const params: any[] = [];

    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }

    query += ' ORDER BY e.date DESC, e.id DESC';
    const [rows]: any = await pool.execute(query, params);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response) => {
  const { title, category, amount, payment_method, notes, date } = req.body;
  const userId = req.user?.id || 1;

  if (!title || !amount) {
    return res.status(400).json({ success: false, message: 'Intitulé et montant obligatoires' });
  }

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO expenses (title, category, amount, payment_method, notes, user_id, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        category || 'Charges Générales',
        Number(amount),
        payment_method || 'Espèces',
        notes || null,
        userId,
        date || new Date().toISOString().split('T')[0]
      ]
    );

    return res.status(201).json({ success: true, message: 'Dépense enregistrée', id: result.insertId });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM expenses WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Dépense supprimée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
