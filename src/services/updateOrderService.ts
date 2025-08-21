import { PrismaClient, Order, YardInfo, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export const updateOrder = async (orderId: string, data: any): Promise<Order> => {
  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      throw new Error(`Order with ID ${orderId} not found.`);
    }

    const { yardInfo, billingInfo, shippingInfo, customerInfo, cartItems, ...orderData } = data;

    if (yardInfo) {
      const currentYardInfo = await tx.yardInfo.findUnique({
        where: { orderId },
      });

      if (currentYardInfo) {
        await tx.yardHistory.create({
          data: {
            orderId: currentYardInfo.orderId,
            yardName: currentYardInfo.yardName,
            yardAddress: currentYardInfo.yardAddress,
            yardMobile: currentYardInfo.yardMobile,
            yardEmail: currentYardInfo.yardEmail,
            yardPrice: currentYardInfo.yardPrice,
            yardWarranty: currentYardInfo.yardWarranty,
            yardMiles: currentYardInfo.yardMiles,
            reason: 'Updated by admin',
          },
        });

        const { orderId: oid, yardOwnShippingInfo, ...restOfYardInfo } = yardInfo;
        const dataForYardInfoUpdate: any = { ...restOfYardInfo };
        if (yardOwnShippingInfo === null) {
          dataForYardInfoUpdate.yardOwnShippingInfo = Prisma.JsonNull;
        } else if (yardOwnShippingInfo !== undefined) {
          dataForYardInfoUpdate.yardOwnShippingInfo = yardOwnShippingInfo;
        }
        await tx.yardInfo.update({
          where: { orderId },
          data: dataForYardInfoUpdate,
        });
      } else {
        const { yardOwnShippingInfo, ...restOfNewYardInfo } = yardInfo;
        const dataForNewYardInfo: any = {
          orderId,
          ...restOfNewYardInfo,
        };
        if (yardOwnShippingInfo === null) {
          dataForNewYardInfo.yardOwnShippingInfo = Prisma.JsonNull;
        } else if (yardOwnShippingInfo !== undefined) {
          dataForNewYardInfo.yardOwnShippingInfo = yardOwnShippingInfo;
        }
        await tx.yardInfo.create({
          data: dataForNewYardInfo,
        });
      }
    }

    const { customerId, addressId, ...restOfOrderData } = orderData;
    const updateData: any = { ...restOfOrderData };

    if (billingInfo) {
      updateData.billingSnapshot = billingInfo;
    }
    if (shippingInfo) {
      updateData.shippingSnapshot = shippingInfo;
    }
    if (cartItems) {
      await tx.orderItem.deleteMany({
        where: {
          orderId: orderId,
        },
      });
      updateData.items = {
        create: cartItems.map((item: any) => ({
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          warranty: item.warranty,
          milesPromised: item.milesPromised,
          specification: item.specification,
          productVariantId: item.productVariantId,
        })),
      };
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: true,
        items: true,
        payments: true,
        yardInfo: true,
        yardHistory: true,
        address: true,
      },
    });

    return updatedOrder;
  });
};