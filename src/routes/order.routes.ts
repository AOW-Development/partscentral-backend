import { Router } from 'express';
import { createOrder, getOrders, updateOrder, getOrderById } from '../controllers/orderController';

const router = Router();

router.get('/', getOrders);
// Ensure route matches frontend endpoint
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.put('/:id', updateOrder);


export default router;