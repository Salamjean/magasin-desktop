import { Request, Response } from 'express';
import { pool } from '../../config/db.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';

export const getAllDeliveries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT d.*, u.name as livreur_name, u.phone as livreur_phone 
      FROM deliveries d 
      LEFT JOIN users u ON d.livreur_id = u.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    // If user is livreur, filter to own deliveries only
    if (req.user?.role === 'livreur') {
      query += ' AND d.livreur_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC';

    const [rows]: any = await pool.execute(query, params);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createDelivery = async (req: Request, res: Response) => {
  const { sale_id, customer_name, customer_phone, delivery_address, livreur_id, notes } = req.body;
  if (!customer_name || !customer_phone || !delivery_address) {
    return res.status(400).json({ success: false, message: 'Coordonnées du client obligatoires' });
  }

  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

  try {
    const [result]: any = await pool.execute(
      `INSERT INTO deliveries 
       (sale_id, customer_name, customer_phone, delivery_address, livreur_id, status, otp_code, notes, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        sale_id || 0,
        customer_name,
        customer_phone,
        delivery_address,
        livreur_id || null,
        'pending',
        otpCode,
        notes || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Course de livraison créée',
      deliveryId: result.insertId,
      otpCode
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const validateDeliveryOtp = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { otp_code } = req.body;

  if (!otp_code) {
    return res.status(400).json({ success: false, message: 'Code OTP requis' });
  }

  try {
    const [delivs]: any = await pool.execute('SELECT * FROM deliveries WHERE id = ?', [id]);
    if (!delivs || delivs.length === 0) {
      return res.status(404).json({ success: false, message: 'Livraison introuvable' });
    }

    const delivery = delivs[0];
    if (delivery.otp_code !== otp_code.trim()) {
      return res.status(400).json({ success: false, message: 'Code OTP incorrect' });
    }

    await pool.execute('UPDATE deliveries SET status = ?, delivered_at = NOW() WHERE id = ?', ['delivered', id]);
    return res.json({ success: true, message: 'Livraison validée et confirmée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
