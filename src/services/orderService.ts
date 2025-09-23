import {
  PrismaClient,
  OrderSource,
  AddressType,
  PaymentStatus,
  OrderStatus,
  Warranty,
} from "@prisma/client";

const prisma = new PrismaClient();

interface CreateOrderPayload {
  // Required fields
  billingInfo: any;
  shippingInfo: any;
  customerInfo: any;
  cartItems: any[];
  paymentInfo: any;
  orderNumber: string;
  totalAmount: number;
  subtotal: number;

  // Invoice fields
  invoiceSentAt?: Date | string;
  invoiceStatus?: string;
  invoiceConfirmedAt?: Date | string;

  // Order fields (matching schema)
  source?: string;
  status?: string;
  year?: number;
  saleMadeBy?: string;
  notes?: string;
  vinNumber?: string;
  orderDate?: Date | string;
  carrierName?: string;
  trackingNumber?: string;
  customerNotes?: string | any;
  yardNotes?: string | any;
  shippingAddress?: string;
  billingAddress?: string;
  alternativePhone?: number;
  // Financial fields
  taxesAmount?: number;
  shippingAmount?: number;
  handlingFee?: number;
  processingFee?: number;
  corePrice?: number;
  milesPromised?: number;

  // Address and company
  addressType?: AddressType;
  companyName?: string;

  // PO Information
  poStatus?: string;
  poSentAt?: Date | string;
  poConfirmAt?: Date | string;

  // Yard information
  yardInfo?: any;

  // Warranty
  warranty?: string;

  // Metadata
  metadata?: any;
  idempotencyKey?: string;
}

export const createOrder = async (
  payload: CreateOrderPayload
): Promise<any> => {
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
      status,
      year,
      saleMadeBy,
      notes,
      vinNumber,
      orderDate,

      alternativePhone,
      carrierName,
      trackingNumber,
      customerNotes,
      yardNotes,
      shippingAddress,
      billingAddress,
      taxesAmount,
      shippingAmount,
      handlingFee,
      processingFee,
      corePrice,

      addressType,
      companyName,
      poStatus,
      poSentAt,
      poConfirmAt,
      yardInfo,
      metadata,
      idempotencyKey,
      invoiceSentAt,
      invoiceStatus,
      invoiceConfirmedAt,
      warranty,
    } = payload;

    const mappedAddressType =
      typeof addressType === "string"
        ? AddressType[addressType.toUpperCase() as keyof typeof AddressType]
        : addressType;
    const warrantyMap: { [key: string]: Warranty } = {
      "30 Days": Warranty.WARRANTY_30_DAYS,
      "60 Days": Warranty.WARRANTY_60_DAYS,
      "90 Days": Warranty.WARRANTY_90_DAYS,
      "6 Months": Warranty.WARRANTY_6_MONTHS,
      "1 Year": Warranty.WARRANTY_1_YEAR,
    };

    let validWarranty: Warranty;
    if (warranty && warrantyMap[warranty]) {
      validWarranty = warrantyMap[warranty];
    } else if (
      warranty &&
      Object.values(Warranty).includes(warranty as Warranty)
    ) {
      validWarranty = warranty as Warranty;
    } else {
      validWarranty = Warranty.WARRANTY_30_DAYS;
    }

    return prisma.$transaction(async (tx) => {
      // 1. Find or Create Customer
      let customer = await tx.customer.findUnique({
        where: { email: customerInfo.email },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            email: customerInfo.email,
            full_name:
              customerInfo.firstName ||
              `${customerInfo.firstName || billingInfo.firstName} ${
                customerInfo.lastName || billingInfo.lastName
              }`,
            alternativePhone: customerInfo.alternativePhone
              ? customerInfo.alternativePhone.toString()
              : null,
          },
        });
      } else if (customerInfo.alternativePhone) {
        // Update existing customer with alternativePhone if provided
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            alternativePhone: customerInfo.alternativePhone.toString(),
          },
        });
      }

      // 2. Create Address
      const newAddress = await tx.address.create({
        data: {
          addressType: mappedAddressType || AddressType.RESIDENTIAL,
          shippingInfo: shippingInfo,
          billingInfo: billingInfo,
          companyName:
            companyName || shippingInfo.company || billingInfo.company || null,
        },
      });

      // 3. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          source: source,
          status: status,
          subtotal: subtotal,
          totalAmount: totalAmount,
          year: year ? parseInt(year.toString(), 10) : null,
          saleMadeBy,
          notes,
          vinNumber,
          orderDate: orderDate ? new Date(orderDate) : null,
          carrierName,
          trackingNumber,
          shippingAddress,
          billingAddress,
          companyName:
            companyName || shippingInfo.company || billingInfo.company || null,
          billingSnapshot: billingInfo,
          shippingSnapshot: shippingInfo,
          addressId: newAddress.id,
          addressType: mappedAddressType || AddressType.RESIDENTIAL,
          customerNotes: customerNotes
            ? typeof customerNotes === "string"
              ? JSON.parse(customerNotes)
              : customerNotes
            : null,
          yardNotes: yardNotes
            ? typeof yardNotes === "string"
              ? JSON.parse(yardNotes)
              : yardNotes
            : null,
          taxesAmount: taxesAmount ? parseFloat(taxesAmount.toString()) : null,
          shippingAmount: shippingAmount
            ? parseFloat(shippingAmount.toString())
            : null,
          handlingFee: handlingFee ? parseFloat(handlingFee.toString()) : null,
          processingFee: processingFee
            ? parseFloat(processingFee.toString())
            : null,
          corePrice: corePrice ? parseFloat(corePrice.toString()) : null,
          poStatus,
          poSentAt: poSentAt ? new Date(poSentAt) : null,
          poConfirmAt: poConfirmAt ? new Date(poConfirmAt) : null,
          metadata: metadata || null,
          idempotencyKey: idempotencyKey || null,

          invoiceSentAt: invoiceSentAt ? new Date(invoiceSentAt) : null,
          invoiceStatus: invoiceStatus || null,
          invoiceConfirmedAt: invoiceConfirmedAt
            ? new Date(invoiceConfirmedAt)
            : null,
          warranty: validWarranty,
        },
      });

      // 4. Create Order Items
      console.log(
        "DEBUG: Creating order items with cartItems:",
        JSON.stringify(cartItems, null, 2)
      );
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
          const specification = product.description || "";

          const orderItemData = {
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
            specification: item.specification || specification,
            milesPromised: item.milesPromised
              ? parseFloat(item.milesPromised.toString())
              : null,
            pictureUrl: item.pictureUrl || null,
            pictureStatus: item.pictureStatus || null,
            // metadata: item.warranty ? { warranty: item.warranty, milesPromised: item.milesPromised } : null,
          };

          console.log(
            "DEBUG: Creating order item with data:",
            JSON.stringify(orderItemData, null, 2)
          );

          await tx.orderItem.create({
            data: orderItemData,
          });
        }
      }

      // 5. Create Payment (if paymentInfo is provided)
      if (paymentInfo && paymentInfo.cardData) {
        const [expMonth, expYear] =
          paymentInfo.cardData.expirationDate.split("/");
        const cardExpiryDate = new Date(
          parseInt(`20${expYear}`),
          parseInt(expMonth) - 1,
          1
        );

        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: paymentInfo.provider || "NA",
            amount: paymentInfo.amount || totalAmount,
            currency: paymentInfo.currency || "USD",
            method: paymentInfo.paymentMethod,
            status: PaymentStatus.SUCCEEDED,
            paidAt: new Date(),
            cardHolderName: paymentInfo.cardData.cardholderName,
            cardNumber: paymentInfo.cardData.cardNumber,
            cardCvv: paymentInfo.cardData.securityCode,
            cardExpiry: cardExpiryDate,
            last4:
              paymentInfo.cardData.last4 ||
              paymentInfo.cardData.cardNumber?.slice(-4),
            cardBrand: paymentInfo.cardData.brand,

            //  alternate card details

            alternateCardHolderName:
              paymentInfo.alternateCardData?.cardholderName,
            alternateCardNumber: paymentInfo.alternateCardData?.cardNumber,
            alternateCardCvv: paymentInfo.alternateCardData?.securityCode,
            alternateCardExpiry: paymentInfo.alternateCardData?.expirationDate
              ? new Date(
                  parseInt(
                    `20${
                      paymentInfo.alternateCardData.expirationDate.split("/")[1]
                    }`
                  ),
                  parseInt(
                    paymentInfo.alternateCardData.expirationDate.split("/")[0]
                  ) - 1,
                  1
                )
              : null,
            alternateLast4:
              paymentInfo.alternateCardData?.last4 ||
              paymentInfo.alternateCardData?.cardNumber?.slice(-4),
            alternateCardBrand: paymentInfo.alternateCardData?.brand,

            approvelCode: paymentInfo.approvelCode,
            charged: paymentInfo.charged,
            entity: paymentInfo.entity || "NA",
            chargedDate: paymentInfo.cardChargedDate
              ? new Date(paymentInfo.cardChargedDate)
              : null,
          } as any,
        });
      }

      // 6. Create YardInfo (if yardInfo is provided)
      if (yardInfo) {
        await tx.yardInfo.create({
          data: {
            orderId: order.id,
            ...yardInfo,
          },
        });
      }

      // Update order status to PAID if payment was made
      // const finalStatus = paymentInfo ? OrderStatus.PAID : OrderStatus.PENDING;
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: order.status },
        include: {
          customer: true,
          items: true,
          yardInfo: true,
        },
      });

      return updatedOrder;
    });
  } catch (err) {
    console.error("OrderService error:", err, payload);
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
        createdAt: "desc",
      },
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    throw err;
  }
};

export const getOrderById = async (orderId: string): Promise<any> => {
  try {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: true,
        payments: true,
        yardInfo: true,
        yardHistory: true,
        address: true,
      },
    });
  } catch (err) {
    console.error(`Error fetching order ${orderId}:`, err);
    throw err;
  }
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  try {
    // Use a transaction to delete all related records first, then the order
    await prisma.$transaction(async (tx) => {
      // Delete related records first (in order of dependencies)
      await tx.orderItem.deleteMany({
        where: { orderId },
      });

      await tx.orderEvent.deleteMany({
        where: { orderId },
      });

      await tx.payment.deleteMany({
        where: { orderId },
      });

      await tx.yardHistory.deleteMany({
        where: { orderId },
      });

      // Delete YardInfo (one-to-one relationship)
      await tx.yardInfo.deleteMany({
        where: { orderId },
      });

      // Finally, delete the order itself
      await tx.order.delete({
        where: { id: orderId },
      });
    });
  } catch (err) {
    console.error(`Error deleting order ${orderId}:`, err);
    throw err;
  }
};
