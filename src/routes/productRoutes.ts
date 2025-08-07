import express from 'express';
const router = express.Router();
const productController = require('../controllers/productController')

router.get('/' , productController.getProductsByVehicle) ;
router.get('/with-subparts', productController.getProductsWithSubPartsByVehicle);
router.get('/grouped-with-subparts', productController.getGroupedProductWithSubParts);
router.get('/v2/grouped-with-subparts', productController.getGroupedProductWithSubPartsV2);

router.get('/years', productController.getYearsForMakeModel);
export default router;