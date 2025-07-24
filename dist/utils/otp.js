"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTPEmail = exports.generateOTP = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
const transporter = nodemailer_1.default.createTransport({
    // Configure your email service here
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendOTPEmail = async (email, otp) => {
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@example.com',
            to: email,
            subject: 'Your Verification Code',
            text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
            html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
        });
    }
    catch (error) {
        console.error('Failed to send OTP email:', error);
        throw new Error('Failed to send verification email');
    }
};
exports.sendOTPEmail = sendOTPEmail;
