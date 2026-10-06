import { Router } from 'express';
import {
  syncBatch,
  syncHealth,
  syncPullAll,
  syncPush,
  deleteCashRegisterSync
} from '../controllers/admin/sync.controller.js';

const router = Router();

router.get('/health', syncHealth);
router.get('/pull', syncPullAll);
router.post('/push', syncPush);
router.post('/batch', syncBatch);
router.delete('/cash-registers/:id', deleteCashRegisterSync);

export default router;
