import { Router } from "express";
import {
  getLeadsController,
  webhookVerificationController,
  webhookController,
  syncLeadsController,
} from "../controllers/leadController";
import {
  createLeadController,
  getAllLeadsController,
  getLeadByIdController,
  updateLeadController,
  deleteLeadController,
} from "../controllers/manualLeadController";

const router = Router();

router.get("/leads", getLeadsController);
router.get("/webhook", webhookVerificationController);
router.post("/webhook", webhookController);
router.post("/leads/sync", syncLeadsController);

// Manual lead CRUD routes
router.post("/leads/manual", createLeadController);
router.get("/leads/manual", getAllLeadsController);
router.get("/leads/manual/:id", getLeadByIdController);
router.put("/leads/manual/:id", updateLeadController);
router.delete("/leads/manual/:id", deleteLeadController);

export default router;
