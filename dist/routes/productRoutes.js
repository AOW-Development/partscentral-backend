"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const productController = require('../controllers/productController');
router.get('/', productController.getProductsByVehicle);
router.get('/with-subparts', productController.getProductsWithSubPartsByVehicle);
router.get('/grouped-with-subparts', productController.getGroupedProductWithSubParts);
router.get('/years', productController.getYearsForMakeModel);
module.exports = router;
