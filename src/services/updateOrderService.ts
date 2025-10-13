import {
  PrismaClient,
  Order,
  Prisma,
  AddressType,
  Warranty,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

export const updateOrder = async (
  orderId: string,
  data: any
): Promise<Order> => {
  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!existingOrder) {
      throw new Error(`Order with ID ${orderId} not found.`);
    }

    const {
      yardInfo,
      billingInfo,
      shippingInfo,
      customerInfo,
      cartItems,
      paymentInfo,
      ...orderData
    } = data;

    const { customerId, addressId, ...restOfOrderData } = orderData;
    const updateData: any = { ...restOfOrderData };

    // Robust Enum Mapping
    if (updateData.addressType && typeof updateData.addressType === "string") {
      const upperType = updateData.addressType
        .toUpperCase()
        .replace(/\s+/g, "_");
      if (Object.values(AddressType).includes(upperType as any)) {
        updateData.addressType = upperType;
      } else if (updateData.addressType === "Yet to Update") {
        updateData.addressType = AddressType;
      }
    }
    if (updateData.status && typeof updateData.status === "string") {
      const upperStatus = updateData.status.toUpperCase().replace(/ /g, "_");
      if (Object.values(OrderStatus).includes(upperStatus as any)) {
        updateData.status = upperStatus;
      }
    }

    // 1. Handle Customer Update
    if (customerInfo) {
      if (
        customerInfo.email &&
        customerInfo.email !== existingOrder.customer.email
      ) {
        const newCustomer = await tx.customer.findUnique({
          where: { email: customerInfo.email },
        });
        if (newCustomer) {
          updateData.customerId = newCustomer.id;
          await tx.customer.update({
            where: { id: newCustomer.id },
            data: {
              full_name: customerInfo.firstName,
              alternativePhone: customerInfo.alternativePhone
                ? customerInfo.alternativePhone.toString()
                : null,
            },
          });
        } else {
          await tx.customer.update({
            where: { id: existingOrder.customerId },
            data: {
              email: customerInfo.email,
              full_name: customerInfo.firstName,
              alternativePhone: customerInfo.alternativePhone
                ? customerInfo.alternativePhone.toString()
                : null,
            },
          });
        }
      } else {
        await tx.customer.update({
          where: { id: existingOrder.customerId },
          data: {
            full_name: customerInfo.firstName,
            alternativePhone: customerInfo.alternativePhone
              ? customerInfo.alternativePhone.toString()
              : null,
          },
        });
      }
    }

    // 2. Handle Address Upsert
    if (billingInfo || shippingInfo) {
      const addressType = orderData.addressType;
      let mappedAddressType;
      if (typeof addressType === "string") {
        const upperType = addressType.toUpperCase().replace(/\s+/g, "_");
        if (Object.values(AddressType).includes(upperType as any)) {
          mappedAddressType = upperType;
        } else if (addressType === "Yet to Update") {
          mappedAddressType = AddressType;
        } else {
          mappedAddressType = addressType;
        }
      } else {
        mappedAddressType = addressType;
      }
      const addressData = {
        addressType:
          mappedAddressType &&
          Object.values(AddressType).includes(mappedAddressType)
            ? mappedAddressType
            : existingOrder.addressType,
        shippingInfo: shippingInfo || Prisma.JsonNull,
        billingInfo: billingInfo || Prisma.JsonNull,
        companyName:
          orderData.companyName ||
          shippingInfo?.company ||
          billingInfo?.company ||
          null,
      };
      if (existingOrder.addressId) {
        await tx.address.update({
          where: { id: existingOrder.addressId },
          data: addressData,
        });
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
        yardTaxesPrice: yardInfo.yardTaxesPrice,
        yardHandlingFee: yardInfo.yardHandlingFee,
        yardProcessingFee: yardInfo.yardProcessingFee,
        yardCorePrice: yardInfo.yardCorePrice,
      };
      if (yardInfo.yardWarranty) {
        const warrantyMap: { [key: string]: Warranty } = {
          "30 DAYS": Warranty.WARRANTY_30_DAYS,
          "60 DAYS": Warranty.WARRANTY_60_DAYS,
          "90 DAYS": Warranty.WARRANTY_90_DAYS,
          "6 MONTHS": Warranty.WARRANTY_6_MONTHS,
          "1 YEAR": Warranty.WARRANTY_1_YEAR,
        };
        const upperWarranty = yardInfo.yardWarranty
          .toUpperCase()
          .replace(" ", "_");
        if (warrantyMap[upperWarranty])
          dataForYardInfoUpdate.yardWarranty = warrantyMap[upperWarranty];
        else if (Object.values(Warranty).includes(upperWarranty as any))
          dataForYardInfoUpdate.yardWarranty = upperWarranty;
      }

      if (yardInfo.yardPrice !== undefined)
        dataForYardInfoUpdate.yardPrice = parseFloat(yardInfo.yardPrice);
      if (yardInfo.yardMiles !== undefined)
        dataForYardInfoUpdate.yardMiles = parseFloat(yardInfo.yardMiles);
      if (yardInfo.yardShippingCost !== undefined)
        dataForYardInfoUpdate.yardShippingCost = parseFloat(
          yardInfo.yardShippingCost
        );
      if (yardInfo.yardOwnShippingInfo === null)
        dataForYardInfoUpdate.yardOwnShippingInfo = Prisma.JsonNull;
      else if (yardInfo.yardOwnShippingInfo !== undefined)
        dataForYardInfoUpdate.yardOwnShippingInfo =
          yardInfo.yardOwnShippingInfo;

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
            reason: "Updated by admin",
          },
        });
        await tx.yardInfo.update({
          where: { orderId },
          data: dataForYardInfoUpdate,
        });
      } else {
        await tx.yardInfo.create({
          data: { orderId, ...dataForYardInfoUpdate },
        });
      }
    }

    // 4. Handle OrderItems Sync
    if (cartItems) {
      const existingItems = await tx.orderItem.findMany({
        where: { orderId: orderId },
      });
      const cartSkus = cartItems.map((item: { sku: any }) => item.sku);
      for (const item of cartItems) {
        const existingItem = existingItems.find((ei) => ei.sku === item.sku);
        if (existingItem) {
          await tx.orderItem.update({
            where: { id: existingItem.id },
            data: {
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
              specification: item.specification || existingItem.specification,
              milesPromised: item.milesPromised
                ? parseFloat(item.milesPromised.toString())
                : null,
              pictureUrl: item.pictureUrl || existingItem.pictureUrl,
              pictureStatus: item.pictureStatus || existingItem.pictureStatus,
            } as any,
          });
        } else {
          // Check if this is a manual item (no real product variant)
          const isManualItem = item.sku.startsWith("manual-");

          let productVariant = null;
          let product = null;
          let makeName = "";
          let modelName = "";
          let yearName = "";
          let partName = "";

          if (isManualItem) {
            // For manual items, extract info from the item name or use defaults
            const nameParts = item.name.split(" ");
            makeName = nameParts[0] || "Manual";
            modelName = nameParts[1] || "Item";
            yearName = nameParts[2] || "2024";
            partName = nameParts.slice(3).join(" ") || "Part";
          } else {
            // For real product variants, find the variant
            productVariant = await tx.productVariant_1.findUnique({
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
            if (!productVariant || !productVariant.product)
              throw new Error(
                `Product variant with SKU ${item.sku} not found.`
              );
            product = productVariant.product;
            makeName = product.modelYear.model.make.name;
            modelName = product.modelYear.model.name;
            yearName = product.modelYear.year.value;
            partName = product.partType.name;
          }
          await tx.orderItem.create({
            data: {
              orderId: orderId,
              productVariantId: isManualItem
                ? null
                : productVariant?.id || null,
              product_id: isManualItem ? null : product?.id || null,
              sku: item.sku,
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
              specification:
                item.specification ||
                (product ? product.description : "") ||
                "",
              milesPromised: item.milesPromised
                ? parseFloat(item.milesPromised.toString())
                : null,
              pictureUrl: item.pictureUrl || null,
              pictureStatus: item.pictureStatus || null,
            } as any,
          });
        }
      }
      const itemsToRemove = existingItems.filter(
        (ei) => !cartSkus.includes(ei.sku)
      );
      for (const itemToRemove of itemsToRemove) {
        await tx.orderItem.delete({ where: { id: itemToRemove.id } });
      }
    }

    // 5. Handle Multiple Payments Upsert with explicit parsing
    if (paymentInfo) {
      console.log(
        "DEBUG: Payment Info received in updateOrderService:",
        paymentInfo
      );
      // Handle multiple payment entries
      const paymentsToProcess = Array.isArray(paymentInfo)
        ? paymentInfo
        : [paymentInfo];
      console.log("DEBUG: Payments to process:", paymentsToProcess);
      const getCardExpiry = (dateStr: string) => {
        if (!dateStr || !dateStr.includes("/")) return null;
        const [expMonth, expYear] = dateStr.split("/");
        return new Date(parseInt(`20${expYear}`), parseInt(expMonth) - 1, 1);
      };

      // Get existing payments for this order
      const existingPayments = await tx.payment.findMany({
        where: { orderId },
      });

      // Process payments
      for (let i = 0; i < paymentsToProcess.length; i++) {
        const payment = paymentsToProcess[i];
        if (payment) {
          // Check if there's any meaningful payment information
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
          const hasApprovalCode =
            (payment.approvelCode && payment.approvelCode.trim() !== "") ||
            (payment.approvalCode && payment.approvalCode.trim() !== "");
          const hasCharged = payment.charged && payment.charged.trim() !== "";
          const hasEntity = payment.entity && payment.entity.trim() !== "";

          console.log("DEBUG: Payment validation:", {
            hasCardData,
            hasAlternateCardData,
            hasPaymentMethod,
            hasApprovalCode,
            hasCharged,
            hasEntity,
            cardData: payment.cardData,
            alternateCardData: payment.alternateCardData,
            paymentMethod: payment.paymentMethod,
            merchantMethod: payment.merchantMethod,
          });

          // Allow payment creation if ANY payment-related field has data
          if (
            !hasCardData &&
            !hasAlternateCardData &&
            !hasPaymentMethod &&
            !hasApprovalCode &&
            !hasCharged &&
            !hasEntity &&
            payment.amount === undefined
          ) {
            console.log(
              "DEBUG: Skipping payment - no payment data provided at all"
            );
            continue;
          }

          // Map payment status to enum
          let mappedStatus: PaymentStatus = PaymentStatus.PENDING;
          if (payment.status) {
            const upperStatus = payment.status.toUpperCase();
            if (
              Object.values(PaymentStatus).includes(
                upperStatus as PaymentStatus
              )
            ) {
              mappedStatus = upperStatus as PaymentStatus;
            }
          }

          // Calculate amount with proper fallback
          let paymentAmount = 0;
          if (payment.amount !== undefined && payment.amount !== null) {
            const parsedAmount = parseFloat(payment.amount.toString());
            paymentAmount = isNaN(parsedAmount) ? 0 : parsedAmount;
          } else if (
            orderData.totalAmount !== undefined &&
            orderData.totalAmount !== null
          ) {
            const parsedTotal = parseFloat(orderData.totalAmount.toString());
            paymentAmount = isNaN(parsedTotal) ? 0 : parsedTotal;
          } else {
            // Fallback to existing order total
            const existingTotal = parseFloat(
              existingOrder.totalAmount.toString()
            );
            paymentAmount = isNaN(existingTotal) ? 0 : existingTotal;
          }

          const paymentData: any = {
            provider: payment.provider || null,
            amount: paymentAmount,
            currency: payment.currency || "USD",
            method: payment.paymentMethod || payment.merchantMethod || null,
            status: mappedStatus,
            paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
            approvelCode: payment.approvelCode || payment.approvalCode || null,
            charged: payment.charged || null,
            entity: payment.entity || null,
            chargedDate: payment.cardChargedDate
              ? new Date(payment.cardChargedDate)
              : null,
            // Card details with defaults
            cardHolderName: payment.cardData?.cardholderName || null,
            cardNumber: payment.cardData?.cardNumber || null,
            cardCvv: payment.cardData?.securityCode || null,
            cardExpiry: payment.cardData?.expirationDate
              ? getCardExpiry(payment.cardData.expirationDate)
              : null,
            last4:
              payment.cardData?.last4 ||
              payment.cardData?.cardNumber?.slice(-4) ||
              null,
            cardBrand: payment.cardData?.brand || null,
            // Alternate card details with defaults
            alternateCardHolderName:
              payment.alternateCardData?.cardholderName || null,
            alternateCardNumber: payment.alternateCardData?.cardNumber || null,
            alternateCardCvv: payment.alternateCardData?.securityCode || null,
            alternateCardExpiry: payment.alternateCardData?.expirationDate
              ? getCardExpiry(payment.alternateCardData.expirationDate)
              : null,
            alternateLast4:
              payment.alternateCardData?.last4 ||
              payment.alternateCardData?.cardNumber?.slice(-4) ||
              null,
            alternateCardBrand: payment.alternateCardData?.brand || null,
          };

          // Check if we should update existing payment or create new one
          const existingPayment = existingPayments[i];

          if (existingPayment) {
            // Update existing payment
            console.log(
              "DEBUG: Updating existing payment:",
              existingPayment.id
            );
            await tx.payment.update({
              where: { id: existingPayment.id },
              data: paymentData,
            });
          } else {
            // Create new payment
            console.log("DEBUG: Creating new payment for order:", orderId);
            await tx.payment.create({
              data: {
                orderId: orderId,
                ...paymentData,
              } as any,
            });
          }
        }
      }

      // Delete extra payments if the new list is shorter
      if (existingPayments.length > paymentsToProcess.length) {
        const paymentsToDelete = existingPayments.slice(
          paymentsToProcess.length
        );
        for (const paymentToDelete of paymentsToDelete) {
          await tx.payment.delete({ where: { id: paymentToDelete.id } });
        }
      }
    }

    // 6. Prepare and Update Order
    if (updateData.warranty) {
      const warrantyMap: { [key: string]: Warranty } = {
        "30 DAYS": Warranty.WARRANTY_30_DAYS,
        "60 DAYS": Warranty.WARRANTY_60_DAYS,
        "90 DAYS": Warranty.WARRANTY_90_DAYS,
        "6 MONTHS": Warranty.WARRANTY_6_MONTHS,
        "1 YEAR": Warranty.WARRANTY_1_YEAR,
      };
      const upperWarranty = updateData.warranty.toUpperCase().replace(" ", "_");
      if (warrantyMap[upperWarranty])
        updateData.warranty = warrantyMap[upperWarranty];
      else if (Object.values(Warranty).includes(upperWarranty as any))
        updateData.warranty = upperWarranty;
    }
    if (updateData.invoiceSentAt)
      updateData.invoiceSentAt = new Date(updateData.invoiceSentAt);
    if (updateData.invoiceConfirmedAt)
      updateData.invoiceConfirmedAt = new Date(updateData.invoiceConfirmedAt);
    if (updateData.poSentAt)
      updateData.poSentAt = new Date(updateData.poSentAt);
    if (updateData.poConfirmAt)
      updateData.poConfirmAt = new Date(updateData.poConfirmAt);
    if (updateData.orderDate)
      updateData.orderDate = new Date(updateData.orderDate);
    if (billingInfo) updateData.billingSnapshot = billingInfo;
    if (shippingInfo) updateData.shippingSnapshot = shippingInfo;
    if (updateData.internalNotes !== undefined)
      updateData.internalNotes = updateData.internalNotes;

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
