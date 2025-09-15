"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const yardController_1 = require("../controllers/yardController");
const router = (0, express_1.Router)();
router.post('/move-to-history/:orderId', yardController_1.moveYardInfoToHistory);
exports.default = router;
