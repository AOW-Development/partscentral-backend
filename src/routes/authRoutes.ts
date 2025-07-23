import express from 'express';
import {
  register,
  login,
  verifyOTP,
  googleAuth,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/google', googleAuth);

// Protected route example
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
