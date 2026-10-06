import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.js';
import { createSale } from '../controllers/admin/sales.controller.js';
import {
  getActiveSession,
  openSession,
  addMovement,
  closeSession
} from '../controllers/caissier/session.controller.js';
import {
  findSaleByInvoice,
  processReturn
} from '../controllers/caissier/returns.controller.js';
import { getAllProducts } from '../controllers/admin/products.controller.js';
import { getAllCategories } from '../controllers/admin/categories.controller.js';
import { getAllCustomers } from '../controllers/admin/customers.controller.js';

const router = Router();

router.use(authenticateJWT);

// POS & Catalog
router.get('/products', getAllProducts);
router.get('/categories', getAllCategories);
router.get('/customers', getAllCustomers);
router.post('/checkout', createSale);

// Cash session
router.get('/session/active', getActiveSession);
router.post('/session/open', openSession);
router.post('/session/movement', addMovement);
router.put('/session/:id/close', closeSession);

// Returns
router.get('/returns/search', findSaleByInvoice);
router.post('/returns/process', processReturn);

export default router;
