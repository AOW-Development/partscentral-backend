import { PrismaClient, Order, Prisma, AddressType, Warranty, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const updateOrder = async (orderId: string, data: any): Promise<Order> => {
  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!existingOrder) {
      throw new Error(`Order with ID ${orderId} not found.`);
    }

    const { yardInfo, billingInfo, shippingInfo, customerInfo, cartItems, paymentInfo, ...orderData } = data;
    
    const { customerId, addressId, ...restOfOrderData } = orderData;
    const updateData: any = { ...restOfOrderData };

    // Robust Enum Mapping
    if (updateData.addressType && typeof updateData.addressType === 'string') {
        const upperType = updateData.addressType.toUpperCase();
        if (Object.values(AddressType).includes(upperType as any)) {
            updateData.addressType = upperType;
        }
    }
    if (updateData.status && typeof updateData.status === 'string') {
        const upperStatus = updateData.status.toUpperCase().replace(/ /g, '_');
        if (Object.values(OrderStatus).includes(upperStatus as any)) {
            updateData.status = upperStatus;
        }
    }

    // 1. Handle Customer Update
    if (customerInfo) {
      if (customerInfo.email && customerInfo.email !== existingOrder.customer.email) {
        const newCustomer = await tx.customer.findUnique({ where: { email: customerInfo.email } });
        if (newCustomer) {
          updateData.customerId = newCustomer.id;
          await tx.customer.update({ where: { id: newCustomer.id }, data: { full_name: customerInfo.firstName, alternativePhone: customerInfo.alternativePhone ? parseInt(customerInfo.alternativePhone.toString(), 10) : null } });
        } else {
          await tx.customer.update({ where: { id: existingOrder.customerId }, data: { email: customerInfo.email, full_name: customerInfo.firstName, alternativePhone: customerInfo.alternativePhone ? parseInt(customerInfo.alternativePhone.toString(), 10) : null } });
        }
      } else {
        await tx.customer.update({ where: { id: existingOrder.customerId }, data: { full_name: customerInfo.firstName, alternativePhone: customerInfo.alternativePhone ? parseInt(customerInfo.alternativePhone.toString(), 10) : null } });
      }
    }

    // 2. Handle Address Upsert
    if (billingInfo || shippingInfo) {
        const addressType = orderData.addressType;
        const mappedAddressType = typeof addressType === 'string' ? (addressType.toUpperCase() as any) : addressType;
        const addressData = { addressType: mappedAddressType && Object.values(AddressType).includes(mappedAddressType) ? mappedAddressType : existingOrder.addressType, shippingInfo: shippingInfo || Prisma.JsonNull, billingInfo: billingInfo || Prisma.JsonNull, companyName: orderData.companyName || shippingInfo?.company || billingInfo?.company || null };
        if (existingOrder.addressId) {
            await tx.address.update({ where: { id: existingOrder.addressId }, data: addressData });
        } else {
            const newAddress = await tx.address.create({ data: addressData });
            updateData.addressId = newAddress.id;
        }
    }

    // 3. Handle YardInfo Upsert with explicit parsing
    if (yardInfo) {
      const dataForYardInfoUpdate: any = {
        yardName: yardInfo.yardName,
        yardAddress: yardInfo.yardAddress,
        yardMobile: yardInfo.yardMobile,
        yardEmail: yardInfo.yardEmail,
        attnName: yardInfo.attnName,
        yardShippingType: yardInfo.yardShippingType,
        reason: yardInfo.reason,
      };
      if (yardInfo.yardWarranty) {
        const warrantyMap: { [key: string]: Warranty } = { '30 DAYS': Warranty.WARRANTY_30_DAYS, '60 DAYS': Warranty.WARRANTY_60_DAYS, '90 DAYS': Warranty.WARRANTY_90_DAYS, '6 MONTHS': Warranty.WARRANTY_6_MONTHS, '1 YEAR': Warranty.WARRANTY_1_YEAR };
        const upperWarranty = yardInfo.yardWarranty.toUpperCase().replace(' ', '_');
        if (warrantyMap[upperWarranty]) dataForYardInfoUpdate.yardWarranty = warrantyMap[upperWarranty];
        else if (Object.values(Warranty).includes(upperWarranty as any)) dataForYardInfoUpdate.yardWarranty = upperWarranty;
      }

      if (yardInfo.yardPrice !== undefined) dataForYardInfoUpdate.yardPrice = parseFloat(yardInfo.yardPrice);
      if (yardInfo.yardMiles !== undefined) dataForYardInfoUpdate.yardMiles = parseFloat(yardInfo.yardMiles);
      if (yardInfo.yardShippingCost !== undefined) dataForYardInfoUpdate.yardShippingCost = parseFloat(yardInfo.yardShippingCost);
      if (yardInfo.yardOwnShippingInfo === null) dataForYardInfoUpdate.yardOwnShippingInfo = Prisma.JsonNull;
      else if (yardInfo.yardOwnShippingInfo !== undefined) dataForYardInfoUpdate.yardOwnShippingInfo = yardInfo.yardOwnShippingInfo;

      const currentYardInfo = await tx.yardInfo.findUnique({ where: { orderId } });
      if (currentYardInfo) {
        await tx.yardHistory.create({ data: { orderId: currentYardInfo.orderId, yardName: currentYardInfo.yardName, yardAddress: currentYardInfo.yardAddress, yardMobile: currentYardInfo.yardMobile, yardEmail: currentYardInfo.yardEmail, yardPrice: currentYardInfo.yardPrice, yardWarranty: currentYardInfo.yardWarranty, yardMiles: currentYardInfo.yardMiles, reason: 'Updated by admin' } });
        await tx.yardInfo.update({ where: { orderId }, data: dataForYardInfoUpdate });
      } else {
        await tx.yardInfo.create({ data: { orderId, ...dataForYardInfoUpdate } });
      }
    }

    // 4. Handle OrderItems Sync
    if (cartItems) {
      const existingItems = await tx.orderItem.findMany({ where: { orderId: orderId } });
      const cartSkus = cartItems.map((item: { sku: any; }) => item.sku);
      for (const item of cartItems) {
        const existingItem = existingItems.find(ei => ei.sku === item.sku);
        if (existingItem) {
          await tx.orderItem.update({ where: { id: existingItem.id }, data: { quantity: item.quantity, unitPrice: item.price, lineTotal: item.price * item.quantity, specification: item.specification || existingItem.specification, milesPromised: item.milesPromised ? parseFloat(item.milesPromised.toString()) : null, pictureUrl: item.pictureUrl || existingItem.pictureUrl, pictureStatus: item.pictureStatus || existingItem.pictureStatus } });
        } else {
          const productVariant = await tx.productVariant_1.findUnique({ where: { sku: item.sku }, include: { product: { include: { modelYear: { include: { model: { include: { make: true } }, year: true } }, partType: true } } } });
          if (!productVariant || !productVariant.product) throw new Error(`Product variant with SKU ${item.sku} not found.`);
          const { product } = productVariant;
          await tx.orderItem.create({ data: { orderId: orderId, productVariantId: productVariant.id, product_id: product.id, sku: item.sku, quantity: item.quantity, unitPrice: item.price, lineTotal: item.price * item.quantity, makeName: product.modelYear.model.make.name, modelName: product.modelYear.model.name, yearName: product.modelYear.year.value, partName: product.partType.name, specification: item.specification || product.description || '', milesPromised: item.milesPromised ? parseFloat(item.milesPromised.toString()) : null, pictureUrl: item.pictureUrl || null, pictureStatus: item.pictureStatus || null } });
        }
      }
      const itemsToRemove = existingItems.filter(ei => !cartSkus.includes(ei.sku));
      for (const itemToRemove of itemsToRemove) { await tx.orderItem.delete({ where: { id: itemToRemove.id } }); }
    }

    // 5. Handle Payment Upsert with explicit parsing
    if (paymentInfo) {
        const getCardExpiry = (dateStr: string) => { if (!dateStr || !dateStr.includes('/')) return null; const [expMonth, expYear] = dateStr.split('/'); return new Date(parseInt(`20${expYear}`), parseInt(expMonth) - 1, 1); };
        const paymentData: any = {
            provider: paymentInfo.provider || 'NA',
            amount: paymentInfo.amount !== undefined ? parseFloat(paymentInfo.amount) : parseFloat(orderData.totalAmount),
            currency: paymentInfo.currency || 'USD',
            method: paymentInfo.paymentMethod,
            status: paymentInfo.status || 'PENDING',
            paidAt: new Date(),
            approvelCode: paymentInfo.approvelCode,
            charged: paymentInfo.charged,
            entity: paymentInfo.entity || 'NA',
        };
        if (paymentInfo.cardData) { paymentData.cardHolderName = paymentInfo.cardData.cardholderName; paymentData.cardNumber = paymentInfo.cardData.cardNumber; paymentData.cardCvv = paymentInfo.cardData.securityCode; paymentData.cardExpiry = getCardExpiry(paymentInfo.cardData.expirationDate); paymentData.last4 = paymentInfo.cardData.last4 || paymentInfo.cardData.cardNumber?.slice(-4); paymentData.cardBrand = paymentInfo.cardData.brand; }
        if (paymentInfo.alternateCardData) { paymentData.alternateCardHolderName = paymentInfo.alternateCardData.cardholderName; paymentData.alternateCardNumber = paymentInfo.alternateCardData.cardNumber; paymentData.alternateCardCvv = paymentInfo.alternateCardData.securityCode; paymentData.alternateCardExpiry = getCardExpiry(paymentInfo.alternateCardData.expirationDate); paymentData.alternateLast4 = paymentInfo.alternateCardData.last4 || paymentInfo.alternateCardData.cardNumber?.slice(-4); paymentData.alternateCardBrand = paymentInfo.alternateCardData.brand; }
        
        const existingPayment = await tx.payment.findFirst({ where: { orderId } });
        if (existingPayment) {
            await tx.payment.update({ where: { id: existingPayment.id }, data: paymentData });
        } else {
            if (paymentData.cardHolderName && paymentData.cardNumber && paymentData.cardCvv && paymentData.cardExpiry) {
                await tx.payment.create({ data: { orderId: orderId, ...paymentData } });
            } else {
                console.log(`Skipping payment creation for order ${orderId} due to missing required card details.`);
            }
        }
    }

    // 6. Prepare and Update Order
    if (updateData.warranty) {
      const warrantyMap: { [key: string]: Warranty } = { '30 DAYS': Warranty.WARRANTY_30_DAYS, '60 DAYS': Warranty.WARRANTY_60_DAYS, '90 DAYS': Warranty.WARRANTY_90_DAYS, '6 MONTHS': Warranty.WARRANTY_6_MONTHS, '1 YEAR': Warranty.WARRANTY_1_YEAR };
      const upperWarranty = updateData.warranty.toUpperCase().replace(' ', '_');
      if (warrantyMap[upperWarranty]) updateData.warranty = warrantyMap[upperWarranty];
      else if (Object.values(Warranty).includes(upperWarranty as any)) updateData.warranty = upperWarranty;
    }
    if (updateData.invoiceSentAt) updateData.invoiceSentAt = new Date(updateData.invoiceSentAt);
    if (updateData.invoiceConfirmedAt) updateData.invoiceConfirmedAt = new Date(updateData.invoiceConfirmedAt);
    if (updateData.poSentAt) updateData.poSentAt = new Date(updateData.poSentAt);
    if (updateData.poConfirmAt) updateData.poConfirmAt = new Date(updateData.poConfirmAt);
    if (updateData.orderDate) updateData.orderDate = new Date(updateData.orderDate);
    if (billingInfo) updateData.billingSnapshot = billingInfo;
    if (shippingInfo) updateData.shippingSnapshot = shippingInfo;

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
      include: { customer: true, items: true, payments: true, yardInfo: true, yardHistory: true, address: true },
    });

    return updatedOrder;
  });
};