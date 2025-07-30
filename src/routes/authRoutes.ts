import express, { Request, Response, RequestHandler } from 'express';
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', authController.register as RequestHandler);
router.post('/login', authController.login as RequestHandler);
router.post('/verify-otp', authController.verifyOTP as RequestHandler);
router.get('/google', authController.googleAuth as RequestHandler);
router.get('/google/callback', authController.googleAuth as RequestHandler);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile as RequestHandler);

export default router;
