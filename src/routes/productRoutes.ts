import express from 'express';
const router = express.Router();
const productController = require('../controllers/productController')

router.get('/' , productController.getProductsByVehicle) ;
module.exports= router ;