import { PrismaClient, OrderSource, AddressType, PaymentStatus, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateOrderPayload {
  billingInfo: any;
  shippingInfo: any;
  customerInfo: any;
  cartItems: any[];
  paymentInfo: any;
  orderNumber: string;
  totalAmount: number;
  subtotal: number;
  source?: OrderSource;
  notes?: string;
  carrierName?: string;
  trackingNumber?: string;
  saleMadeBy?: string;
  yardInfo?: any;
  // Add all other fields from the admin dashboard form
  taxesAmount?: number;
  handlingFee?: number;
  processingFee?: number;
  corePrice?: number;
  milesPromised?: number;
  addressType?: AddressType;
  companyName?: string;
  poStatus?: string;
  poSentAt?: Date;
  poConfirmAt?: Date;
}

export const createOrder = async (payload: CreateOrderPayload): Promise<any> => {
  try {
    const {
      billingInfo,
      shippingInfo,
      customerInfo,
      cartItems,
      paymentInfo,
      totalAmount,
      subtotal,
      orderNumber,
      source,
      notes,
      carrierName,
      trackingNumber,
      saleMadeBy,
      yardInfo,
      taxesAmount,
      handlingFee,
      processingFee,
      corePrice,
      milesPromised,
      addressType,
      companyName,
      poStatus,
      poSentAt,
      poConfirmAt,
    } = payload;

    return prisma.$transaction(async (tx) => {
      // 1. Find or Create Customer
      let customer = await tx.customer.findUnique({
        where: { email: customerInfo.email },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            email: customerInfo.email,
            full_name: `${customerInfo.firstName || billingInfo.firstName} ${customerInfo.lastName || billingInfo.lastName}`,
          },
        });
      }

      // 2. Create Address
      const newAddress = await tx.address.create({
        data: {
          addressType: addressType || AddressType.RESIDENTIAL,
          shippingInfo: shippingInfo,
          billingInfo: billingInfo,
          companyName: companyName || shippingInfo.company || billingInfo.company || null,
        },
      });

      // 3. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          source: source || OrderSource.STOREFRONT,
          status: OrderStatus.PENDING,
          subtotal: subtotal,
          totalAmount: totalAmount,
          billingSnapshot: billingInfo,
          shippingSnapshot: shippingInfo,
          addressId: newAddress.id,
          addressType: addressType || AddressType.RESIDENTIAL,
          notes,
          carrierName,
          trackingNumber,
          saleMadeBy,
          taxesAmount,
          handlingFee,
          processingFee,
          corePrice,
          milesPromised,
          poStatus,
          poSentAt,
          poConfirmAt,
        },
      });

      // 4. Create Order Items
      if (cartItems && cartItems.length > 0) {
        for (const item of cartItems) {
          const productVariant = await tx.productVariant_1.findUnique({
            where: { sku: item.id },
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
            throw new Error(`Product variant with SKU ${item.id} not found.`);
          }

          const product = productVariant.product;
          const makeName = product.modelYear.model.make.name;
          const modelName = product.modelYear.model.name;
          const yearName = product.modelYear.year.value;
          const partName = product.partType.name;
          const specification = product.description || '';

          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productVariantId: productVariant.id,
              product_id: product.id,
              sku: productVariant.sku,
              quantity: item.quantity,
              unitPrice: item.price,
              lineTotal: item.price * item.quantity,
              makeName: makeName,
              modelName: modelName,
              yearName: yearName,
              partName: partName,
              specification: specification,
              source: source || OrderSource.STOREFRONT,
              status: OrderStatus.PENDING,
            },
          });
        }
      }

      // 5. Create Payment (if paymentInfo is provided)
      if (paymentInfo && paymentInfo.cardData) {
        const [expMonth, expYear] = paymentInfo.cardData.expirationDate.split('/');
        const cardExpiryDate = new Date(parseInt(`20${expYear}`), parseInt(expMonth) - 1, 1);

        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: paymentInfo.paymentMethod,
            amount: totalAmount,
            currency: 'USD',
            method: paymentInfo.paymentMethod,
            status: PaymentStatus.SUCCEEDED,
            paidAt: new Date(),
            cardHolderName: paymentInfo.cardData.cardholderName,
            cardNumber: paymentInfo.cardData.cardNumber,
            cardCvv: paymentInfo.cardData.securityCode,
            cardExpiry: cardExpiryDate,
            entity: 'order',
          },
        });
      }

      // 6. Create YardInfo (if yardInfo is provided)
      if (yardInfo) {
        try {
          await tx.yardInfo.create({
            data: {
              orderId: order.id,
              ...yardInfo,
            },
          });
          console.log('YardInfo created successfully for order:', order.id);
        } catch (yardError) {
          console.error('Error creating YardInfo:', yardError, yardInfo);
        }
      }

      // Update order status to PAID if payment was made
      const finalStatus = paymentInfo ? OrderStatus.PAID : OrderStatus.PENDING;
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: finalStatus },
        include: {
          customer: true,
          items: true,
          yardInfo: true,
        },
      });
      console.log('Updated order with yardInfo:', updatedOrder);

      return updatedOrder;
    });
  } catch (err) {
    console.error('OrderService error:', err, payload);
    throw err;
  }
};

export const getOrders = async (): Promise<any> => {
  try {
    return await prisma.order.findMany({
      include: {
        customer: true,
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    throw err;
  }
};
