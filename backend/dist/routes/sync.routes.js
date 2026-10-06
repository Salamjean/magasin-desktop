import { Router } from 'express';
import { syncBatch, syncHealth } from '../controllers/admin/sync.controller.js';
const router = Router();
router.get('/health', syncHealth);
router.post('/batch', syncBatch);
export default router;
