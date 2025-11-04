"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const productController = require("../controllers/productController");
router.post("/listings", productController.createListing);
router.delete("/:id", productController.deleteProduct);
router.get("/all", productController.getAllProducts);
router.get("/", productController.getProductsByVehicle);
router.get("/with-subparts", productController.getProductsWithSubPartsByVehicle);
router.get("/grouped-with-subparts", productController.getGroupedProductWithSubParts);
router.get("/v2/grouped-with-subparts", productController.getGroupedProductWithSubPartsV2);
router.get("/years", productController.getYearsForMakeModel);
// Variants
router.post("/:id/variants", productController.createVariant);
router.put("/variants/:variantId", productController.updateVariant);
router.delete("/variants/:variantId", productController.deleteVariant);
exports.default = router;
