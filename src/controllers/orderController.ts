import { Request, Response } from 'express';
import { createOrder as createOrderService } from '../services/orderService';
import { getIO } from '../utils/socket';
// import { sendOrderNotificationEmail } from '../utils/mail'; // Keep commented out for now

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { billingInfo, shippingInfo, customerInfo, cartItems, paymentInfo, totalAmount, subtotal } = req.body;

    // Validate incoming data (basic validation, more robust validation should be added)
    if (!billingInfo || !shippingInfo || !customerInfo || !cartItems || !paymentInfo || totalAmount === undefined || subtotal === undefined) {
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
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};