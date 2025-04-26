import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { productValidator, updateProductValidator } from '../middleware/validators/product.validator.js';

const router = Router();

router.get('/', authMiddleware, getProducts);
router.get('/:id', authMiddleware, getProduct);
router.post('/', authMiddleware, productValidator, createProduct);
router.put('/:id', authMiddleware, updateProductValidator, updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);

export default router; 