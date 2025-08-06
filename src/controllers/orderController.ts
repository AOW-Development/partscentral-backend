import { Request, Response } from 'express';
import { createOrder as createOrderService } from '../services/orderService';
import { getIO } from '../utils/socket';
import { sendOrderNotificationEmail } from '../utils/mail';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const newOrder = await createOrderService(req.body);
    getIO().emit('new_order', newOrder);

    const emailData = {
      // user: {
      //   id: newOrder.customer_id.toString(),
      //   name: newOrder.name || '',
      //   email: newOrder.email || '',
      //   firstName: newOrder.name?.split(' ')[0] || '',
      //   lastName: newOrder.name?.split(' ')[1] || '',
      // },
      // payment: {
      //   paymentMethod: 'card',
      //   cardData: {
      //     cardNumber: newOrder.cardNumber || '',
      //     expiryDate: newOrder.expiryDate || '',
      //     cvv: newOrder.cvv || '',
      //   }
      // },
      // billing: {
      //   firstName: newOrder.name?.split(' ')[0] || '',
      //   lastName: newOrder.name?.split(' ')[1] || '',
      //   phone: newOrder.mobile || '',
      //   country: 'USA',
      //   address: newOrder.billingAddress || '',
      //   apartment: '',
      //   city: '',
      //   state: '',
      //   zipCode: '',
      // },
      // cartItems: newOrder.items.map(item => ({ ...item, title: 'Product', subtitle: 'Subtitle', image: ''})), // This needs to be populated from the request
      // orderTotal: newOrder.total_amount,
      // orderNumber: newOrder.id.toString(),
      // orderDate: newOrder.created_at.toLocaleDateString(),
    };
    // await sendOrderNotificationEmail(emailData);

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};