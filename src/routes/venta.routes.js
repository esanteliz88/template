import { Router } from 'express';
import { createVenta } from '../controllers/venta.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { ventaValidator } from '../middleware/validators/venta.validator.js';

const router = Router();

router.post('/', authMiddleware, ventaValidator, createVenta);

export default router; 