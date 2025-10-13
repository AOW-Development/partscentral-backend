import { Router } from "express";
import {
  createProblematicPart,
  getProblematicPartById,
  getProblematicPartsByOrderId,
  getAllProblematicParts,
  updateProblematicPart,
  deleteProblematicPart,
} from "../controllers/problematicPartController";

const router = Router();

// Get all problematic parts (with pagination)
router.get("/", getAllProblematicParts);

// Get problematic parts by order ID
router.get("/order/:orderId", getProblematicPartsByOrderId);

// Get single problematic part by ID
router.get("/:id", getProblematicPartById);

// Create new problematic part
router.post("/", createProblematicPart);

// Update problematic part
router.put("/:id", updateProblematicPart);

// Delete problematic part
router.delete("/:id", deleteProblematicPart);

export default router;
