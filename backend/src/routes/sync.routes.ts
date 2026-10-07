import { Router } from 'express';
import {
  syncBatch,
  syncHealth,
  syncPullAll,
  syncPush,
  deleteCashRegisterSync,
  updateCashRegisterStatusSync,
  deleteDeliverySync,
  deleteProductSync
} from '../controllers/admin/sync.controller.js';

const router = Router();

router.get('/health', syncHealth);
router.get('/pull', syncPullAll);
router.post('/push', syncPush);
router.post('/batch', syncBatch);
router.patch('/cash-registers/:id', updateCashRegisterStatusSync);
router.delete('/cash-registers/:id', deleteCashRegisterSync);
router.delete('/deliveries/:id', deleteDeliverySync);
router.delete('/products/:id', deleteProductSync);

export default router;
