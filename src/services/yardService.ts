
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const moveYardInfoToHistory = async (orderId: string, reason: string, yardCharge: string) => {
  console.log(`Starting transaction for orderId: ${orderId}`);
  return prisma.$transaction(async (tx) => {
    console.log('Finding yard info...');
    const yardInfo = await tx.yardInfo.findUnique({
      where: { orderId },
    });

    if (!yardInfo) {
      console.error('Yard info not found');
      throw new Error('Yard info not found');
    }
    console.log('Found yard info:', yardInfo);

    const yardCost = {
      yardShippingCost: yardInfo.yardShippingCost,
      yardOwnShippingInfo: yardInfo.yardOwnShippingInfo,
    };

    const historyData = {
      orderId: yardInfo.orderId,
      yardName: yardInfo.yardName,
      yardAddress: yardInfo.yardAddress,
      yardMobile: yardInfo.yardMobile,
      yardEmail: yardInfo.yardEmail,
      yardPrice: yardInfo.yardPrice,
      yardWarranty: yardInfo.yardWarranty,
      yardMiles: yardInfo.yardMiles,
      shipping: yardInfo.yardShippingType,
      yardCost: yardCost,
      reason: reason,
      attnName: yardInfo.attnName,
      yardCharge: yardCharge,
      yardTaxesPrice: yardInfo.yardTaxesPrice,
      yardHandlingFee: yardInfo.yardHandlingFee,
      yardProcessingFee: yardInfo.yardProcessingFee,
      yardCorePrice: yardInfo.yardCorePrice,
    };

    console.log('Creating yard history with data:', historyData);
    const history = await tx.yardHistory.create({
      data: historyData,
    });
    console.log('Created yard history:', history);

    console.log('Deleting yard info...');
    await tx.yardInfo.delete({
      where: { orderId },
    });
    console.log('Deleted yard info.');

    console.log('Transaction completed successfully.');
    return history;
  });
};
