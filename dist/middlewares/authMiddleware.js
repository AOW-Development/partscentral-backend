"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../services/prisma");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await prisma_1.prisma.customer.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
exports.authenticateToken = authenticateToken;
const isAdmin = async (req, res, next) => {
    try {
        const user = await prisma_1.prisma.adminUser.findFirst({
            where: { email: req.user?.email },
        });
        if (!user) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};
exports.isAdmin = isAdmin;
