"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const router = express_1.default.Router();
// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleAuth);
// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
exports.default = router;
