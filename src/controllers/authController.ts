import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { generateOTP, sendOTPEmail } from '../utils/otp';
import '../middlewares/authMiddleware'; // Import to ensure type declarations are loaded

const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL!;
console.log('→ GOOGLE_CALLBACK_URL:', CALLBACK_URL); 
interface RegisterBody {
  email: string;
  password: string;
  full_name: string;
}

interface LoginBody {
  email: string;
  password: string;
  otp?: string;
}

interface VerifyOTPBody {
  email: string;
  otp: string;
}

const prisma = new PrismaClient();

// Ensure Prisma is properly initialized
prisma.$connect().catch((err: Error) => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

const register = async (req: Request & { body: RegisterBody }, res: Response) => {
  try {
    const { email, password, full_name } = req.body;

    // const existingUser = await prisma.customer.findUnique({
    //   where: { email },
    // });

    // if (existingUser) {
    //   return res.status(400).json({ message: 'Email already registered' });
    // }

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

const login = async (req: Request & { body: LoginBody }, res: Response) => {
  try {
    const { email, password, otp } = req.body;

    const user = await prisma.customer.findFirst({
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

const verifyOTP = async (req: Request & { body: VerifyOTPBody }, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.customer.findFirst({
      where: { email},
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

const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  CALLBACK_URL
);

const googleAuth = async (req: Request & { query?: { code?: string } }, res: Response) => {
  try {
    const { code } = req.query;
    
    console.log('→ Environment variables check:');
    console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('  CALLBACK_URL:', CALLBACK_URL);
    
    if (!code) {
      // Initial Google OAuth request
      const authUrl = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        redirect_uri: CALLBACK_URL,
      });
      console.log('→ redirecting to:', authUrl);
      return res.redirect(authUrl);

    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code as string);
    googleClient.setCredentials(tokens);

    // Get user info using access token
    const userInfo = await googleClient.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
    });

    const { email, name, picture } = userInfo.data as { email: string; name: string; picture: string };

    let user = await prisma.customer.findFirst({
      where: { email },
    });

    if (!user) {
      // Create new user if they don't exist
      user = await prisma.customer.create({
        data: {
          email,
          full_name: name,
          image: picture,
          emailVerified: new Date(),
          accounts: {
            create: {
              provider: 'google',
              providerAccountId: email,
              type: 'oauth',
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
            },
          },
        },
        include: {
          accounts: true,
        },
      });
    } else {
      // Update existing user's Google account info
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: email,
          },
        },
        update: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
        },
        create: {
          customerId: user.id,
          provider: 'google',
          providerAccountId: email,
          type: 'oauth',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
        },
      });
    }

    // Generate JWT token for our API
    const jwtToken = sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Redirect to frontend with token
    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`);
  } catch (error) {
    console.error('Google auth error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
};

const getProfile = async (req: Request, res: Response) => {
  if(!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const userId = req.user.userId; // set by JWT middleware
  const user = await prisma.customer.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    image: user.image,
    emailVerified: user.emailVerified,
  });
};

export {
  register,
  login,
  verifyOTP,
  googleAuth,
  getProfile,
};