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
  bulkUploadLeadsController,
} from "../controllers/manualLeadController";
import multer from "multer";

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV and Excel files are allowed."));
    }
  },
});

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

// Bulk upload route
router.post(
  "/leads/manual/bulk-upload",
  upload.single("file"),
  bulkUploadLeadsController
);

export default router;
