import express from 'express';
import { createServer } from 'http';
import { initSocket } from './utils/socket';
import productRoutes from './routes/productRoutes';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/order.routes';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = initSocket(httpServer);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3002';

const allowedOrigins = [FRONTEND_URL, DASHBOARD_URL];

// Configure CORS with specific options
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies, auth headers)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));

app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});