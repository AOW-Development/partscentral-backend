import { Request, Response } from 'express';
import { createOrder as createOrderService } from '../services/orderService';
import { getIO } from '../utils/socket';
import { sendOrderNotificationEmail } from '../utils/mail';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const newOrder = await createOrderService(req.body);
    getIO().emit('new_order', newOrder);

    const emailData = {
      user: {
        id: newOrder.customer_id.toString(),
        name: newOrder.name || '',
        email: newOrder.email || '',
        firstName: newOrder.name?.split(' ')[0] || '',
        lastName: newOrder.name?.split(' ')[1] || '',
      },
      order: {
        orderNumber: newOrder.id.toString(),
        orderDate: newOrder.created_at.toLocaleDateString(),
        totalAmount: newOrder.total_amount,
        status: newOrder.status,
        sellingPrice: newOrder.sellingPrice,
        warranty: newOrder.warranty,
        milesPromised: newOrder.milesPromised,
        make: newOrder.make,
        model: newOrder.model,
        year: newOrder.year,
        part: newOrder.part,
        specification: newOrder.specification,
        pictureStatus: newOrder.pictureStatus,
        trackingNumber: newOrder.trackingNumber,
        poStatus: newOrder.poStatus,
        approvalCode: newOrder.approvalCode,
        chargedAsOn: newOrder.chargedAsOn,
        entity: newOrder.entity,
        charged: newOrder.charged,
        invoiceStatus: newOrder.invoiceStatus,
        costPrice: newOrder.costPrice,
        ownShippingYardShipping: newOrder.ownShippingYardShipping,
        shippingVariance: newOrder.shippingVariance,
        core: newOrder.core,
        taxExtraCharge: newOrder.taxExtraCharge,
        returnShippingCostCustoms: newOrder.returnShippingCostCustoms,
        replacementCostPrice: newOrder.replacementCostPrice,
        replacementShipping: newOrder.replacementShipping,
        partialRefunds: newOrder.partialRefunds,
        totalBuy: newOrder.totalBuy,
        processingFee: newOrder.processingFee,
        depositFee: newOrder.depositFee,
        gp: newOrder.gp,
        saleMadeBy: newOrder.saleMadeBy,
        dateOfSale: newOrder.dateOfSale,
        invoiceMadeBy: newOrder.invoiceMadeBy,
        orderStatus: newOrder.orderStatus,
      },
      payment: {
        method: newOrder.merchantMethod || '',
        cardHolderName: newOrder.cardHolderName || '',
        cardNumber: newOrder.paymentCardNumber || '',
        expiryDate: newOrder.paymentExpiryDate || '',
        cvv: newOrder.cvv || '',
      },
      billing: {
        firstName: newOrder.name?.split(' ')[0] || '',
        lastName: newOrder.name?.split(' ')[1] || '',
        phone: newOrder.mobile || '',
        address: newOrder.billingAddress || '',
      },
      shipping: {
        addressType: newOrder.shippingAddressType || '',
        address: newOrder.shippingAddress || '',
      },
      yardInfo: {
        name: newOrder.yardName || '',
        mobile: newOrder.yardMobile || '',
        address: newOrder.yardAddress || '',
        email: newOrder.yardEmail || '',
        price: newOrder.yardPrice || '',
        warranty: newOrder.yardWarranty || '',
        miles: newOrder.yardMiles || '',
        shipping: newOrder.yardShipping || '',
        cost: newOrder.yardCost || '',
      },
      cartItems: req.body.items.map((item: any) => ({ ...item, title: 'Product', subtitle: 'Subtitle', image: ''})), // This needs to be populated from the request
    };
    await sendOrderNotificationEmail(emailData);

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};