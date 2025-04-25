import { Router } from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { registerValidator, loginValidator, updateUserValidator } from '../middleware/validators/auth.validator.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { loginAttemptLimiter } from '../middleware/rateLimit.db.js';

const router = Router();

// Rutas públicas
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, loginAttemptLimiter, login);

// Rutas protegidas
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateUserValidator, updateProfile);

export default router; 