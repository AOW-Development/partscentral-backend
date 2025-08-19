"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = exports.getOrders = void 0;
const orderService_1 = require("../services/orderService");
const socket_1 = require("../utils/socket");
const getOrders = async (req, res) => {
    try {
        const orders = await (0, orderService_1.getOrders)();
        // Map and flatten orders to match frontend expectations
        const mappedOrders = orders.map((order) => ({
            id: order.id,
            name: order.customer?.full_name || '',
            date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
            email: order.customer?.email || '',
            mobile: order.shippingSnapshot?.phone || '',
            sum: (typeof order.totalAmount === 'object' && typeof order.totalAmount.toNumber === 'function' ? order.totalAmount.toNumber() : order.totalAmount).toString(),
            status: order.status,
        }));
        res.status(200).json(mappedOrders);
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.getOrders = getOrders;
// import { sendOrderNotificationEmail } from '../utils/mail'; // Keep commented out for now
const createOrder = async (req, res) => {
    try {
        const { billingInfo, shippingInfo, customerInfo, cartItems, paymentInfo, totalAmount, subtotal, orderNumber, yardInfo } = req.body;
        // Validate incoming data (basic validation, more robust validation should be added)
        if (!billingInfo || !shippingInfo || !customerInfo || !cartItems || !paymentInfo || totalAmount === undefined || subtotal === undefined || !orderNumber) {
            return res.status(400).json({ error: 'Missing required order information.' });
        }
        const newOrder = await (0, orderService_1.createOrder)({
            billingInfo,
            shippingInfo,
            customerInfo,
            cartItems,
            paymentInfo,
            totalAmount,
            subtotal,
            orderNumber,
            yardInfo, // Pass yardInfo to the service
        });
        // Emit socket.io event
        const socketEventPayload = {
            type: 'new_order',
            order: {
                id: newOrder.id,
                status: newOrder.status,
                total: newOrder.totalAmount.toNumber(), // Convert Decimal to number
                customerName: newOrder.customer.full_name,
                createdAt: newOrder.createdAt.toISOString(),
                mobile: shippingInfo.phone, // Assuming mobile from shippingInfo
                customer_email: newOrder.customer.email,
            },
        };
        (0, socket_1.getIO)().emit('new_order', socketEventPayload);
        // The email sending logic is commented out in the original file, so I'll keep it that way.
        // const emailData = { ... };
        // await sendOrderNotificationEmail(emailData);
        res.status(201).json(newOrder);
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.createOrder = createOrder;
