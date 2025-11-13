import express from "express";
import { webhookController } from "../controllers/webhookController";

const router = express.Router();

router.post("/", webhookController.handle);

export default router;