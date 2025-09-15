"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrder = exports.createOrder = exports.getOrderById = exports.getOrders = void 0;
const orderService_1 = require("../services/orderService");
const updateOrderService_1 = require("../services/updateOrderService");
const socket_1 = require("../utils/socket");
const getOrders = async (req, res) => {
    try {
        const orders = await (0, orderService_1.getOrders)();
        res.status(200).json(orders);
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.getOrders = getOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await (0, orderService_1.getOrderById)(id);
        if (order) {
            res.status(200).json(order);
        }
        else {
            res.status(404).json({ error: 'Order not found' });
        }
    }
    catch (error) {
        console.error(`Error fetching order ${req.params.id}:`, error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.getOrderById = getOrderById;
// import { sendOrderNotificationEmail } from '../utils/mail'; // Keep commented out for now
const createOrder = async (req, res) => {
    try {
        // Extract all fields from request body (wildcard approach for future extensibility)
        const orderPayload = req.body;
        // Validate only the absolutely required fields
        const { billingInfo, shippingInfo, customerInfo, cartItems, paymentInfo, totalAmount, subtotal, orderNumber } = orderPayload;
        if (!billingInfo || !shippingInfo || !customerInfo || !cartItems || !paymentInfo || totalAmount === undefined || subtotal === undefined || !orderNumber) {
            return res.status(400).json({ error: 'Missing required order information.' });
        }
        // Pass the entire payload to the service (allows for future field additions without controller changes)
        const newOrder = await (0, orderService_1.createOrder)(orderPayload);
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
const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const orderData = req.body;
        const updatedOrder = await (0, updateOrderService_1.updateOrder)(id, orderData);
        res.status(200).json(updatedOrder);
    }
    catch (error) {
        console.error(`Error updating order ${req.params.id}:`, error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.updateOrder = updateOrder;
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, orderService_1.deleteOrder)(id);
        res.status(200).json({ message: 'Order deleted successfully' });
    }
    catch (error) {
        console.error(`Error deleting order ${req.params.id}:`, error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.deleteOrder = deleteOrder;
