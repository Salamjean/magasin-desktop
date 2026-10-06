import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.js';
import { getAllDeliveries, validateDeliveryOtp } from '../controllers/admin/deliveries.controller.js';

const router = Router();
router.use(authenticateJWT);

router.get('/deliveries', getAllDeliveries);
router.post('/deliveries/:id/validate-otp', validateDeliveryOtp);

export default router;
