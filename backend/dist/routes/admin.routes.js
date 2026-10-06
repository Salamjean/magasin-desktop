import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.js';
import { getDashboardStats } from '../controllers/admin/dashboard.controller.js';
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/admin/products.controller.js';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../controllers/admin/categories.controller.js';
import { getStockMovements, createStockMovement } from '../controllers/admin/stock.controller.js';
import { getAllCustomers, createCustomer, updateCustomer, settleDebt, deleteCustomer } from '../controllers/admin/customers.controller.js';
import { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/admin/suppliers.controller.js';
import { getAllSales, getSaleById, createSale } from '../controllers/admin/sales.controller.js';
import { getAllPurchases, createPurchase, receivePurchase } from '../controllers/admin/purchases.controller.js';
import { getAllExpenses, createExpense, deleteExpense } from '../controllers/admin/expenses.controller.js';
import { getAllInventories, getInventoryById, validateInventory } from '../controllers/admin/inventory.controller.js';
import { getAllDeliveries, createDelivery, validateDeliveryOtp } from '../controllers/admin/deliveries.controller.js';
import { getAllCashRegisters, createCashRegister, updateCashRegister } from '../controllers/admin/cashRegisters.controller.js';
import { getAllUsers, createUser, updateUser, deleteUser } from '../controllers/admin/users.controller.js';
import { getSettings, updateSettings } from '../controllers/admin/settings.controller.js';
const router = Router();
// Protect all admin routes
router.use(authenticateJWT);
// Dashboard
router.get('/dashboard', getDashboardStats);
// Products
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
// Categories
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);
// Stock Movements
router.get('/stock', getStockMovements);
router.post('/stock', createStockMovement);
// Customers & Debts
router.get('/customers', getAllCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.post('/customers/:id/settle-debt', settleDebt);
router.delete('/customers/:id', deleteCustomer);
// Suppliers
router.get('/suppliers', getAllSuppliers);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);
// Sales
router.get('/sales', getAllSales);
router.get('/sales/:id', getSaleById);
router.post('/sales', createSale);
// Purchases
router.get('/purchases', getAllPurchases);
router.post('/purchases', createPurchase);
router.post('/purchases/:id/receive', receivePurchase);
// Expenses
router.get('/expenses', getAllExpenses);
router.post('/expenses', createExpense);
router.delete('/expenses/:id', deleteExpense);
// Inventory
router.get('/inventories', getAllInventories);
router.get('/inventories/:id', getInventoryById);
router.post('/inventories/validate', validateInventory);
// Deliveries
router.get('/deliveries', getAllDeliveries);
router.post('/deliveries', createDelivery);
router.post('/deliveries/:id/validate-otp', validateDeliveryOtp);
// Cash Registers
router.get('/cash-registers', getAllCashRegisters);
router.post('/cash-registers', createCashRegister);
router.put('/cash-registers/:id', updateCashRegister);
// Users
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
export default router;
