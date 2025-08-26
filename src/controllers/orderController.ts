import { Request, Response } from 'express';
import { createOrder as createOrderService, getOrders as getOrdersService, getOrderById as getOrderByIdService } from '../services/orderService';
import { updateOrder as updateOrderService } from '../services/updateOrderService';
import { getIO } from '../utils/socket';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await getOrdersService();
    res.status(200).json(orders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await getOrderByIdService(id);
    if (order) {
      res.status(200).json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (error: any) {
    console.error(`Error fetching order ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// import { sendOrderNotificationEmail } from '../utils/mail'; // Keep commented out for now

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { billingInfo, shippingInfo, customerInfo, cartItems, paymentInfo, totalAmount, subtotal, orderNumber } = req.body;

    // Validate incoming data (basic validation, more robust validation should be added)
    if (!billingInfo || !shippingInfo || !customerInfo || !cartItems || !paymentInfo || totalAmount === undefined || subtotal === undefined || !orderNumber) {
      return res.status(400).json({ error: 'Missing required order information.' });
    }
  

  const newOrder = await createOrderService({
    billingInfo,
    shippingInfo,
    customerInfo,
    cartItems,
    paymentInfo,
    totalAmount,
    subtotal,
    orderNumber,
    customerNotes: req.body.customerNotes,  
    yardNotes: req.body.yardNotes, 
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

  getIO().emit('new_order', socketEventPayload);

  // The email sending logic is commented out in the original file, so I'll keep it that way.
  // const emailData = { ... };
  // await sendOrderNotificationEmail(emailData);

  res.status(201).json(newOrder);
} catch (error: any) {
  console.error('Error creating order:', error);
  res.status(500).json({ error: error.message || 'Internal server error' });
}}

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderData = req.body;

    const updatedOrder = await updateOrderService(id, orderData);

    res.status(200).json(updatedOrder);
  } catch (error: any) {
    console.error(`Error updating order ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};