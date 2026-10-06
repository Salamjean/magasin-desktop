import { Request, Response } from 'express';
import { pool } from '../../config/db.js';

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.execute(`
      SELECT c.*, COUNT(p.id) as products_count 
      FROM categories c 
      LEFT JOIN products p ON c.id = p.category_id 
      GROUP BY c.id 
      ORDER BY c.name ASC
    `);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, description, icon, color } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO categories (name, description, icon, color) VALUES (?, ?, ?, ?)',
      [name, description || null, icon || 'Layers', color || '#0056a6']
    );
    return res.status(201).json({ success: true, message: 'Catégorie créée', id: result.insertId });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, icon, color } = req.body;

  try {
    await pool.execute(
      'UPDATE categories SET name = ?, description = ?, icon = ?, color = ? WHERE id = ?',
      [name, description || null, icon || 'Layers', color || '#0056a6', id]
    );
    return res.json({ success: true, message: 'Catégorie mise à jour' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Check if products attached
    const [prods]: any = await pool.execute('SELECT id FROM products WHERE category_id = ? LIMIT 1', [id]);
    if (prods && prods.length > 0) {
      return res.status(400).json({ success: false, message: 'Des articles sont rattachés à cette catégorie' });
    }

    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
