import { PrismaClient, Order, YardInfo } from '@prisma/client';

const prisma = new PrismaClient();

export const updateOrder = async (orderId: string, data: Partial<Order> & { yardInfo?: Partial<YardInfo> }): Promise<Order> => {
  return prisma.$transaction(async (tx) => {
    const { yardInfo, ...orderData } = data;

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

        await tx.yardInfo.update({
          where: { orderId },
          data: yardInfo,
        });
      } else {
        await tx.yardInfo.create({
          data: {
            orderId,
            ...yardInfo,
          } as any,
        });
      }
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: orderData,
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
