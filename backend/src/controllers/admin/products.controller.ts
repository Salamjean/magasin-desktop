import { Request, Response } from 'express';
import { pool } from '../../config/db.js';

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { category_id, search, low_stock } = req.query;
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(Number(category_id));
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.reference LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (low_stock === 'true') {
      query += ' AND p.stock_quantity <= p.min_stock';
    }

    query += ' ORDER BY p.id DESC';

    const [rows]: any = await pool.execute(query, params);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const {
    name,
    reference,
    barcode,
    category_id,
    purchase_price,
    selling_price,
    stock_quantity,
    min_stock,
    unit,
    is_active
  } = req.body;

  if (!name || !reference || !barcode || selling_price === undefined) {
    return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
  }

  try {
    const [result]: any = await pool.execute(
      `INSERT INTO products 
       (name, reference, barcode, category_id, purchase_price, selling_price, stock_quantity, min_stock, unit, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        reference,
        barcode,
        category_id || null,
        Number(purchase_price) || 0,
        Number(selling_price) || 0,
        Number(stock_quantity) || 0,
        Number(min_stock) || 5,
        unit || 'pièce',
        is_active === false ? 0 : 1
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      id: result.insertId
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    reference,
    barcode,
    category_id,
    purchase_price,
    selling_price,
    stock_quantity,
    min_stock,
    unit,
    is_active
  } = req.body;

  try {
    await pool.execute(
      `UPDATE products 
       SET name = ?, reference = ?, barcode = ?, category_id = ?, purchase_price = ?, selling_price = ?, 
           stock_quantity = ?, min_stock = ?, unit = ?, is_active = ? 
       WHERE id = ?`,
      [
        name,
        reference,
        barcode,
        category_id || null,
        Number(purchase_price) || 0,
        Number(selling_price) || 0,
        Number(stock_quantity) || 0,
        Number(min_stock) || 5,
        unit || 'pièce',
        is_active ? 1 : 0,
        id
      ]
    );

    return res.json({ success: true, message: 'Produit mis à jour avec succès' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Produit supprimé avec succès' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
