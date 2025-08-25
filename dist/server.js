"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_1 = require("./utils/socket");
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const leadRoutes_1 = __importDefault(require("./routes/leadRoutes"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = (0, socket_1.initSocket)(httpServer);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:4000';
const allowedOrigins = [FRONTEND_URL, DASHBOARD_URL];
// Configure CORS with specific options
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.log('CORS blocked for origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow credentials (cookies, auth headers)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));
app.use(express_1.default.json());
app.use('/api/products', productRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/orders', order_routes_1.default);
app.use('/api', leadRoutes_1.default);
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
