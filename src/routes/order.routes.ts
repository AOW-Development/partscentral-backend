import { Router } from 'express';
import { createOrder, getOrders } from '../controllers/orderController';

const router = Router();

router.get('/', getOrders);
// Ensure route matches frontend endpoint
router.post('/', createOrder);

export default router;