"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createOrder = async (orderData) => {
    const { items, ...rest } = orderData;
    const newOrder = await prisma.order.create({
        data: {
            ...rest,
            items: {
                create: items.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                })),
            },
        },
        include: {
            items: true,
        },
    });
    return newOrder;
};
exports.createOrder = createOrder;
