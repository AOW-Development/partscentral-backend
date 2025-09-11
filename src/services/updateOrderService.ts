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

    // Explicitly handle date conversions for invoice fields
    if (updateData.invoiceSentAt) {
      updateData.invoiceSentAt = new Date(updateData.invoiceSentAt);
    }
    if (updateData.invoiceConfirmedAt) {
      updateData.invoiceConfirmedAt = new Date(updateData.invoiceConfirmedAt);
    }

    if (billingInfo) {
      updateData.billingSnapshot = billingInfo;
    }
    if (shippingInfo) {
      updateData.shippingSnapshot = shippingInfo;
    }
    if (cartItems) {
      // Get existing order items
      const existingItems = await tx.orderItem.findMany({
        where: { orderId: orderId },
      });

      // Update existing items or create new ones
      for (const item of cartItems) {
        const existingItem = existingItems.find(ei => ei.sku === item.sku);
        
        if (existingItem) {
          // Update existing item with new data
          await tx.orderItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: item.quantity,
              unitPrice: item.price,
              lineTotal: item.price * item.quantity,
              specification: item.specification || existingItem.specification,
              milesPromised: item.milesPromised ? parseFloat(item.milesPromised.toString()) : null,
              pictureUrl: item.pictureUrl || existingItem.pictureUrl,
              pictureStatus: item.pictureStatus || existingItem.pictureStatus,
              // metadata: item.warranty ? { warranty: item.warranty, milesPromised: item.milesPromised } : existingItem.metadata,
            },
          });
        } else {
          // Create new item only if it doesn't exist
          const productVariant = await tx.productVariant_1.findUnique({
            where: { sku: item.sku },
            include: {
              product: {
                include: {
                  modelYear: {
                    include: {
                      model: { include: { make: true } },
                      year: true,
                    },
                  },
                  partType: true,
                },
              },
            },
          });

          if (!productVariant || !productVariant.product) {
            throw new Error(`Product variant with SKU ${item.sku} not found.`);
          }

          const product = productVariant.product;
          const makeName = product.modelYear.model.make.name;
          const modelName = product.modelYear.model.name;
          const yearName = product.modelYear.year.value;
          const partName = product.partType.name;
          const specification = product.description || '';

          await tx.orderItem.create({
            data: {
              orderId: orderId,
              productVariantId: productVariant.id,
              product_id: product.id,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.price,
              lineTotal: item.price * item.quantity,
              makeName: makeName,
              modelName: modelName,
              yearName: yearName,
              partName: partName,
              specification: item.specification || specification,
              milesPromised: item.milesPromised ? parseFloat(item.milesPromised.toString()) : null,
              pictureUrl: item.pictureUrl || null,
              pictureStatus: item.pictureStatus || null,
              metadata: item.warranty ? { warranty: item.warranty, milesPromised: item.milesPromised } : undefined,
            },
          });
        }
      }

      // Remove items that are no longer in the cart
      const cartSkus = cartItems.map((item: { sku: any; }) => item.sku);
      const itemsToRemove = existingItems.filter(ei => !cartSkus.includes(ei.sku));
      
      for (const itemToRemove of itemsToRemove) {
        await tx.orderItem.delete({
          where: { id: itemToRemove.id },
        });
      }
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