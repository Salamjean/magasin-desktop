import { Request, Response } from 'express';
import { pool } from '../../config/db.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today revenue (exclut les ventes annulées)
    const [todaySales]: any = await pool.execute(
      "SELECT COALESCE(SUM(total_amount), 0) as today_revenue, COUNT(id) as today_count FROM sales WHERE DATE(created_at) = ? AND payment_status != 'cancelled' AND (status != 'cancelled' OR status IS NULL)",
      [today]
    );

    // Total sales revenue (exclut les ventes annulées)
    const [allSales]: any = await pool.execute(
      "SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as total_count FROM sales WHERE payment_status != 'cancelled' AND (status != 'cancelled' OR status IS NULL)"
    );

    // Total expenses
    const [allExpenses]: any = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses'
    );

    // Total customer debts
    const [allDebts]: any = await pool.execute(
      'SELECT COALESCE(SUM(current_debt), 0) as total_debts FROM customers'
    );

    // Low stock products count
    const [lowStockProds]: any = await pool.execute(
      'SELECT id, name, reference, barcode, stock_quantity, min_stock, unit FROM products WHERE stock_quantity <= min_stock AND is_active = 1'
    );

    // Recent 5 sales
    const [recentSales]: any = await pool.execute(
      `SELECT s.id, s.invoice_number, s.total_amount, s.payment_method, s.payment_status, s.created_at, c.name as customer_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       ORDER BY s.created_at DESC LIMIT 5`
    );

    return res.json({
      success: true,
      data: {
        todayRevenue: Number(todaySales[0]?.today_revenue || 0),
        todaySalesCount: Number(todaySales[0]?.today_count || 0),
        totalRevenue: Number(allSales[0]?.total_revenue || 0),
        totalSalesCount: Number(allSales[0]?.total_count || 0),
        totalExpenses: Number(allExpenses[0]?.total_expenses || 0),
        totalDebts: Number(allDebts[0]?.total_debts || 0),
        lowStockCount: lowStockProds.length,
        lowStockProducts: lowStockProds,
        recentSales
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
