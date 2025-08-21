"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const router = (0, express_1.Router)();
router.get('/', orderController_1.getOrders);
// Ensure route matches frontend endpoint
router.get('/:id', orderController_1.getOrderById);
router.post('/', orderController_1.createOrder);
router.put('/:id', orderController_1.updateOrder);
exports.default = router;
