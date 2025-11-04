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
  internalNotes?: string;
  vinNumber?: string;
  orderDate?: Date | string;
  carrierName?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date | string;
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

  // Order Category Status
  orderCategoryStatus?: string;
  problematicIssueType?: string;

  // Metadata
  metadata?: any;
  idempotencyKey?: string;

  pictureUrl?: string;
  pictureStatus?: string;
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
      internalNotes,
      vinNumber,
      orderDate,

      alternativePhone,
      carrierName,
      trackingNumber,
      estimatedDeliveryDate,
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
      orderCategoryStatus,
      problematicIssueType,
      pictureUrl,
      pictureStatus,
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

    let validWarranty: Warranty | null = null;
    if (warranty && warrantyMap[warranty]) {
          validWarranty = warrantyMap[warranty];
    } else if (
          warranty &&
          Object.values(Warranty).includes(warranty as Warranty)
    ) {
          validWarranty = warranty as Warranty;
    } else {
          validWarranty = null;
    }

    const formatFullAddress = (info: any) => {
      if (!info) return "";

      const company = info.company || info.companyName || "";

      const addressLine = info.address || info.street || info.addressLine || "";

      const apartment = info.apartment || "";

      const city = info.city || "";

      const state = info.state || "";

      const zipCode = info.zipCode || info.zip || "";

      const country = info.country || "";

      return [company, addressLine, apartment, city, state, zipCode, country]

        .filter(Boolean)

        .join(", ");
    };

    const shippingAddressStr = formatFullAddress(shippingInfo);

    const billingAddressStr = formatFullAddress(billingInfo);

    console.log("Formatted shipping address:", shippingAddressStr);

    console.log("Formatted billing address:", billingAddressStr);

    return prisma.$transaction(async (tx) => {
      // 1. Find or Create Customer
      // let customer = await tx.customer.findUnique({
      //   where: { email: customerInfo.email },
      // });

      // if (!customer) {
      //   customer = await tx.customer.create({
      //     data: {
      //       email: customerInfo.email,
      //       full_name:
      //         customerInfo.firstName ||
      //         `${customerInfo.firstName || billingInfo.firstName} ${
      //           customerInfo.lastName || billingInfo.lastName
      //         }`,
      //       alternativePhone: customerInfo.alternativePhone
      //         ? customerInfo.alternativePhone.toString()
      //         : null,
      //     },
      //   });
      // } else if (customerInfo.alternativePhone) {
      //   // Update existing customer with alternativePhone if provided
      //   customer = await tx.customer.update({
      //     where: { id: customer.id },
      //     data: {
      //       alternativePhone: customerInfo.alternativePhone.toString(),
      //     },
      //   });
      // }

      const customer = await tx.customer.create({
        data: {
          email: customerInfo.email,
          // full_name:
          //   customerInfo.firstName ||
          //   `${customerInfo.firstName || billingInfo.firstName} ${
          //     customerInfo.lastName || billingInfo.lastName
          //   }`,
          full_name: `${customerInfo.firstName || billingInfo.firstName} ${
            customerInfo.lastName || billingInfo.lastName
          }`.trim(),
          alternativePhone: customerInfo.alternativePhone
            ? customerInfo.alternativePhone.toString()
            : null,
        },
      });

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
          internalNotes: internalNotes,
          totalAmount: totalAmount,
          year: year ? parseInt(year.toString(), 10) : null,
          saleMadeBy,
          notes,
          vinNumber,
          orderDate: orderDate ? new Date(orderDate) : null,
          carrierName,
          trackingNumber,
          estimatedDeliveryDate: estimatedDeliveryDate
            ? new Date(estimatedDeliveryDate)
            : null,
          shippingAddress: shippingAddressStr || shippingAddress ,
          billingAddress : billingAddressStr || billingAddress,
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

          pictureUrl: pictureUrl || null,
          pictureStatus: pictureStatus || null,

          invoiceSentAt: invoiceSentAt ? new Date(invoiceSentAt) : null,
          invoiceStatus: invoiceStatus || null,
          invoiceConfirmedAt: invoiceConfirmedAt
            ? new Date(invoiceConfirmedAt)
            : null,
          warranty: validWarranty,
          ...(orderCategoryStatus !== undefined
            ? { orderCategoryStatus: orderCategoryStatus || null }
            : {}),
          ...(problematicIssueType !== undefined
            ? { problematicIssueType: problematicIssueType || null }
            : {}),
        },
      });

      // 4. Create Order Items
      console.log(
        "DEBUG: Creating order items with cartItems:",
        JSON.stringify(cartItems, null, 2)
      );
      if (cartItems && cartItems.length > 0) {
        for (const item of cartItems) {
          // Check if this is a manual item (no real product variant)
          const isManualItem = item.id.startsWith("manual-");
          console.log("DEBUG: Processing item:", { id: item.id, isManualItem });

          let productVariant = null;
          let product = null;
          let makeName = "";
          let modelName = "";
          let yearName = "";
          let partName = "";
          let specification = "";

          if (isManualItem) {
            console.log("DEBUG: Processing as manual item");
            // For manual items, extract info from the item name or use defaults
            const nameParts = item.name.split(" ");
            makeName = nameParts[0] || "Manual";
            modelName = nameParts[1] || "Item";
            yearName = nameParts[2] || "2024";
            partName = nameParts.slice(3).join(" ") || "Part";
            specification = item.specification || "";
          } else {
            console.log("DEBUG: Processing as real product variant");
            // For real product variants, find the variant
            productVariant = await tx.productVariant_1.findUnique({
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

            product = productVariant.product;
            makeName = product.modelYear.model.make.name;
            modelName = product.modelYear.model.name;
            yearName = product.modelYear.year.value;
            partName = product.partType.name;
            specification = product.description || "";
          }

          const orderItemData = {
            orderId: order.id,
            productVariantId: isManualItem ? null : productVariant?.id || null,
            product_id: isManualItem ? null : product?.id || null,
            sku: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            lineTotal: item.price * item.quantity,
            taxesPrice: item.taxesPrice
              ? parseFloat(item.taxesPrice.toString())
              : null,
            handlingPrice: item.handlingPrice
              ? parseFloat(item.handlingPrice.toString())
              : null,
            processingPrice: item.processingPrice
              ? parseFloat(item.processingPrice.toString())
              : null,
            corePrice: item.corePrice
              ? parseFloat(item.corePrice.toString())
              : null,
            makeName: makeName,
            modelName: modelName,
            yearName: yearName,
            partName: partName,
            specification: item.specification || specification,
            milesPromised: item.milesPromised
              ? parseFloat(item.milesPromised.toString())
              : null,
            vinNumber: item.vinNumber || null,
            notes: item.notes || null,
            // pictureUrl: item.pictureUrl || null,
            // pictureStatus: item.pictureStatus || null,
            // metadata: item.warranty ? { warranty: item.warranty, milesPromised: item.milesPromised } : null,
          } as any;

          console.log(
            "DEBUG: Creating order item with data:",
            JSON.stringify(orderItemData, null, 2)
          );

          await tx.orderItem.create({
            data: orderItemData,
          });
        }
      }

      // 5. Create Payments (if paymentInfo is provided)
      if (paymentInfo) {
        console.log(
          "DEBUG: Payment Info received in orderService:",
          paymentInfo
        );
        // Handle multiple payment entries
        const paymentsToCreate = Array.isArray(paymentInfo)
          ? paymentInfo
          : [paymentInfo];
        console.log("DEBUG: Payments to create:", paymentsToCreate);

        for (const payment of paymentsToCreate) {
          if (payment) {
            console.log("DEBUG: Processing payment entry:", {
              id: payment.id,
              merchantMethod: payment.merchantMethod,
              totalPrice: payment.totalPrice,
              amount: payment.amount,
              finalAmount: payment.amount || payment.totalPrice || totalAmount,
            });

            // Skip payment creation if no meaningful payment information is provided
            const hasCardData =
              payment.cardData &&
              payment.cardData.cardNumber &&
              payment.cardData.cardNumber.trim() !== "";
            const hasAlternateCardData =
              payment.alternateCardData &&
              payment.alternateCardData.cardNumber &&
              payment.alternateCardData.cardNumber.trim() !== "";
            const hasPaymentMethod =
              (payment.paymentMethod && payment.paymentMethod.trim() !== "") ||
              (payment.merchantMethod && payment.merchantMethod.trim() !== "");

            console.log("DEBUG: Payment validation:", {
              hasCardData,
              hasAlternateCardData,
              hasPaymentMethod,
              cardData: payment.cardData,
              alternateCardData: payment.alternateCardData,
              paymentMethod: payment.paymentMethod,
              merchantMethod: payment.merchantMethod,
            });

            if (!hasCardData && !hasAlternateCardData && !hasPaymentMethod) {
              console.log(
                "DEBUG: Skipping payment creation - no meaningful payment data provided"
              );
              continue;
            }

            // Handle card data if provided
            let cardExpiryDate = null;
            if (payment.cardData && payment.cardData.expirationDate) {
              const [expMonth, expYear] =
                payment.cardData.expirationDate.split("/");
              cardExpiryDate = new Date(
                parseInt(`20${expYear}`),
                parseInt(expMonth) - 1,
                1
              );
            }

            await tx.payment.create({
              data: {
                order: { connect: { id: order.id } },
                provider: payment.provider || "NA",
                amount: payment.amount || payment.totalPrice || totalAmount,
                currency: payment.currency || "USD",
                method: payment.paymentMethod || payment.merchantMethod,
                status: PaymentStatus.SUCCEEDED,
                paidAt: new Date(),
                cardHolderName: payment.cardData?.cardholderName || "",
                cardNumber: payment.cardData?.cardNumber || "",
                cardCvv: payment.cardData?.securityCode || "",
                cardExpiry: cardExpiryDate || null,
                last4:
                  payment.cardData?.last4 ||
                  payment.cardData?.cardNumber?.slice(-4) ||
                  "",
                cardBrand: payment.cardData?.brand || "",

                //  alternate card details
                alternateCardHolderName:
                  payment.alternateCardData?.cardholderName || "",
                alternateCardNumber:
                  payment.alternateCardData?.cardNumber || "",
                alternateCardCvv: payment.alternateCardData?.securityCode || "",
                alternateCardExpiry: payment.alternateCardData?.expirationDate
                  ? new Date(
                      parseInt(
                        `20${
                          payment.alternateCardData.expirationDate.split("/")[1]
                        }`
                      ),
                      parseInt(
                        payment.alternateCardData.expirationDate.split("/")[0]
                      ) - 1,
                      1
                    )
                  : null,
                alternateLast4:
                  payment.alternateCardData?.last4 ||
                  payment.alternateCardData?.cardNumber?.slice(-4) ||
                  "",
                alternateCardBrand: payment.alternateCardData?.brand || "",

                approvelCode: payment.approvelCode || payment.approvalCode,
                charged: payment.charged,
                entity: payment.entity || "NA",
                chargedDate: payment.cardChargedDate
                  ? new Date(payment.cardChargedDate)
                  : null,
              } as any,
            });
          }
        }
      }

      // 6. Create YardInfo (if yardInfo is provided)
      if (yardInfo) {
        await tx.yardInfo.create({
          data: {
            orderId: order.id,
            ...yardInfo,
            yardCharge: yardInfo.yardCharge || null,
            yardChangedAmount: yardInfo.yardChangedAmount
              ? parseFloat(yardInfo.yardChangedAmount.toString())
              : null,
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
    const order = await prisma.order.findUnique({
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
    // console.log(
    //   "DEBUG: Order fetched from database:",
    //   JSON.stringify(order, null, 2)
    // );
    return order;
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
