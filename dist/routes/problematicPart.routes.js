"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const problematicPartController_1 = require("../controllers/problematicPartController");
const router = (0, express_1.Router)();
// Get all problematic parts (with pagination)
router.get("/", problematicPartController_1.getAllProblematicParts);
// Get problematic parts by order ID
router.get("/order/:orderId", problematicPartController_1.getProblematicPartsByOrderId);
// Get single problematic part by ID
router.get("/:id", problematicPartController_1.getProblematicPartById);
// Create new problematic part
router.post("/", problematicPartController_1.createProblematicPart);
// Update problematic part
router.put("/:id", problematicPartController_1.updateProblematicPart);
// Delete problematic part
router.delete("/:id", problematicPartController_1.deleteProblematicPart);
exports.default = router;
