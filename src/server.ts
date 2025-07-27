const express = require('express');
const productRoutes = require('./routes/productRoutes');
// const authRoutes = require('./routes/authRoutes');
const authRoutes = require('./routes/authRoutes').default || require('./routes/authRoutes');
const cors = require('cors');

const app = express();

const FRONTEND_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://partscentral.us'
    : 'http://localhost:3000';


// Configure CORS with specific options
app.use(cors({
  origin: FRONTEND_URL, // Your frontend URL
  credentials: true, // Allow credentials (cookies, auth headers)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));

app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});