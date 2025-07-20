"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const productService = require('../services/productService');
exports.getProductsByVehicle = async (req, res) => {
    const { make, model, year, part } = req.query;
    try {
        const products = await productService.getProductsByVehicle({ make, model, year, part });
        res.json(products);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
};
