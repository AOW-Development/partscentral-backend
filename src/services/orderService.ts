import { PrismaClient, Order } from '@prisma/client';

const prisma = new PrismaClient();

export const createOrder = async (orderData: any): Promise<Order> => {
  const { items, ...rest } = orderData;
  const newOrder = await prisma.order.create({
    data: {
      ...rest,
      items: {
        create: items.map((item: { product_id: number; quantity: number }) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      items: true,
    },
  });
  return newOrder;
};