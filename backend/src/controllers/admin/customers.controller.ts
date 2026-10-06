import { Request, Response } from 'express';
import { pool } from '../../config/db.js';

export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';
    const [rows]: any = await pool.execute(query, params);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  const { name, phone, email, address, credit_limit } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO customers (name, phone, email, address, credit_limit, current_debt, loyalty_points) VALUES (?, ?, ?, ?, ?, 0, 0)',
      [name, phone || '', email || '', address || '', Number(credit_limit) || 0]
    );
    return res.status(201).json({ success: true, message: 'Client créé', id: result.insertId });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, address, credit_limit } = req.body;

  try {
    await pool.execute(
      'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, credit_limit = ? WHERE id = ?',
      [name, phone || '', email || '', address || '', Number(credit_limit) || 0, id]
    );
    return res.json({ success: true, message: 'Client mis à jour' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const settleDebt = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Montant invalide' });
  }

  try {
    const [custs]: any = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    if (!custs || custs.length === 0) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }

    const currentDebt = Number(custs[0].current_debt || 0);
    const newDebt = Math.max(0, currentDebt - Number(amount));

    await pool.execute('UPDATE customers SET current_debt = ? WHERE id = ?', [newDebt, id]);

    return res.json({
      success: true,
      message: 'Règlement de dette enregistré avec succès',
      remainingDebt: newDebt
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Client supprimé' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
