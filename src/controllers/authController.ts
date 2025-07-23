import { Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { generateOTP, sendOTPEmail } from '../utils/otp';

// Ensure Prisma is properly initialized
prisma.$connect().catch((err: Error) => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, full_name } = req.body;

    const existingUser = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await hash(password, 10);
    const otp = generateOTP();

    const user = await prisma.customer.create({
      data: {
        email,
        password_hash: hashedPassword,
        full_name,
        otp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    await sendOTPEmail(email, otp);

    return res.status(201).json({
      message: 'Registration successful. Please verify your email with OTP.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, otp } = req.body;

    const user = await prisma.customer.findUnique({
      where: { email },
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.otp && user.otp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    const token = sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Clear OTP after successful login
    await prisma.customer.update({
      where: { id: user.id },
      data: { otp: null, otpExpiry: null },
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.customer.findUnique({
      where: { email },
    });

    if (!user || !user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpiry && user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    await prisma.customer.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        otp: null,
        otpExpiry: null,
      },
    });

    return res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { token } = req.body; // Google OAuth token

    // Verify Google token and get user info
    // Implement Google token verification here

    const email = 'user@example.com'; // Get from Google token
    const name = 'User Name'; // Get from Google token

    let user = await prisma.customer.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.customer.create({
        data: {
          email,
          full_name: name,
          emailVerified: new Date(),
        },
      });
    }

    const jwtToken = sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
