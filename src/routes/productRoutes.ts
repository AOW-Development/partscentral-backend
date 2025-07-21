import express from 'express';
const router = express.Router();
const productController = require('../controllers/productController')

router.get('/' , productController.getProductsByVehicle) ;
router.get('/with-subparts', productController.getProductsWithSubPartsByVehicle);
router.get('/grouped-with-subparts', productController.getGroupedProductWithSubParts);
module.exports= router ;