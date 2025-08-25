
import { Router } from 'express';
import {
  getLeadsController,
  webhookVerificationController,
  webhookController,
  syncLeadsController,
} from '../controllers/leadController';

const router = Router();

router.get('/leads', getLeadsController);
router.get('/webhook', webhookVerificationController);
router.post('/webhook', webhookController);
router.post('/leads/sync', syncLeadsController);

export default router;
