
import { Router } from 'express';
import { moveYardInfoToHistory } from '../controllers/yardController';

const router = Router();

router.post('/move-to-history/:orderId', moveYardInfoToHistory);

export default router;
