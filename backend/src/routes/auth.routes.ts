import { Router } from 'express';
import { login, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticateJWT, getProfile);
router.put('/profile', authenticateJWT, updateProfile);

export default router;
