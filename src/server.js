var express = require('express');
var productRoutes = require('./routes/productRoutes');
var cors = require('cors');
var app = express();
app.use(cors());
app.use(express.json());
app.use('/api/products', productRoutes);
var PORT = process.env.PORT || 3001;
app.listen(PORT, function () {
    console.log("Server running on port ".concat(PORT));
});
