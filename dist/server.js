"use strict";
// const express = require('express');
const productRoutes = require('./routes/productRoutes');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/products', productRoutes);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
