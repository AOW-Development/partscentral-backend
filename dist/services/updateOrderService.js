"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrder = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const updateOrder = async (orderId, data) => {
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
        const updateData = { ...restOfOrderData };
        // Robust Enum Mapping
        if (updateData.addressType && typeof updateData.addressType === "string") {
            const upperType = updateData.addressType
                .toUpperCase()
                .replace(/\s+/g, "_");
            if (Object.values(client_1.AddressType).includes(upperType)) {
                updateData.addressType = upperType;
            }
            else if (updateData.addressType === "Yet to Update") {
                updateData.addressType = client_1.AddressType;
            }
        }
        if (updateData.status && typeof updateData.status === "string") {
            const upperStatus = updateData.status.toUpperCase().replace(/ /g, "_");
            if (Object.values(client_1.OrderStatus).includes(upperStatus)) {
                updateData.status = upperStatus;
            }
        }
        // 1. Handle Customer Update
        if (customerInfo) {
            if (customerInfo.email &&
                customerInfo.email !== existingOrder.customer.email) {
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
                }
                else {
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
            }
            else {
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
                if (Object.values(client_1.AddressType).includes(upperType)) {
                    mappedAddressType = upperType;
                }
                else if (addressType === "Yet to Update") {
                    mappedAddressType = client_1.AddressType;
                }
                else {
                    mappedAddressType = addressType;
                }
            }
            else {
                mappedAddressType = addressType;
            }
            const addressData = {
                addressType: mappedAddressType &&
                    Object.values(client_1.AddressType).includes(mappedAddressType)
                    ? mappedAddressType
                    : existingOrder.addressType,
                shippingInfo: shippingInfo || client_1.Prisma.JsonNull,
                billingInfo: billingInfo || client_1.Prisma.JsonNull,
                companyName: orderData.companyName ||
                    shippingInfo?.company ||
                    billingInfo?.company ||
                    null,
            };
            if (existingOrder.addressId) {
                await tx.address.update({
                    where: { id: existingOrder.addressId },
                    data: addressData,
                });
            }
            else {
                const newAddress = await tx.address.create({ data: addressData });
                updateData.addressId = newAddress.id;
            }
        }
        // 3. Handle YardInfo Upsert with explicit parsing
        if (yardInfo) {
            const dataForYardInfoUpdate = {
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
                const warrantyMap = {
                    "30 DAYS": client_1.Warranty.WARRANTY_30_DAYS,
                    "60 DAYS": client_1.Warranty.WARRANTY_60_DAYS,
                    "90 DAYS": client_1.Warranty.WARRANTY_90_DAYS,
                    "6 MONTHS": client_1.Warranty.WARRANTY_6_MONTHS,
                    "1 YEAR": client_1.Warranty.WARRANTY_1_YEAR,
                };
                const upperWarranty = yardInfo.yardWarranty
                    .toUpperCase()
                    .replace(" ", "_");
                if (warrantyMap[upperWarranty])
                    dataForYardInfoUpdate.yardWarranty = warrantyMap[upperWarranty];
                else if (Object.values(client_1.Warranty).includes(upperWarranty))
                    dataForYardInfoUpdate.yardWarranty = upperWarranty;
            }
            if (yardInfo.yardPrice !== undefined)
                dataForYardInfoUpdate.yardPrice = parseFloat(yardInfo.yardPrice);
            if (yardInfo.yardMiles !== undefined)
                dataForYardInfoUpdate.yardMiles = parseFloat(yardInfo.yardMiles);
            if (yardInfo.yardShippingCost !== undefined)
                dataForYardInfoUpdate.yardShippingCost = parseFloat(yardInfo.yardShippingCost);
            if (yardInfo.yardOwnShippingInfo === null)
                dataForYardInfoUpdate.yardOwnShippingInfo = client_1.Prisma.JsonNull;
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
            }
            else {
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
            const cartSkus = cartItems.map((item) => item.sku);
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
                        },
                    });
                }
                else {
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
                    }
                    else {
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
                            throw new Error(`Product variant with SKU ${item.sku} not found.`);
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
                            specification: item.specification ||
                                (product ? product.description : "") ||
                                "",
                            milesPromised: item.milesPromised
                                ? parseFloat(item.milesPromised.toString())
                                : null,
                            pictureUrl: item.pictureUrl || null,
                            pictureStatus: item.pictureStatus || null,
                        },
                    });
                }
            }
            const itemsToRemove = existingItems.filter((ei) => !cartSkus.includes(ei.sku));
            for (const itemToRemove of itemsToRemove) {
                await tx.orderItem.delete({ where: { id: itemToRemove.id } });
            }
        }
        // 5. Handle Multiple Payments Upsert with explicit parsing
        if (paymentInfo) {
            console.log("DEBUG: Payment Info received in updateOrderService:", paymentInfo);
            // Handle multiple payment entries
            const paymentsToProcess = Array.isArray(paymentInfo)
                ? paymentInfo
                : [paymentInfo];
            console.log("DEBUG: Payments to process:", paymentsToProcess);
            const getCardExpiry = (dateStr) => {
                if (!dateStr || !dateStr.includes("/"))
                    return null;
                const [expMonth, expYear] = dateStr.split("/");
                return new Date(parseInt(`20${expYear}`), parseInt(expMonth) - 1, 1);
            };
            // Delete existing payments first
            await tx.payment.deleteMany({
                where: { orderId },
            });
            // Create new payments
            for (const payment of paymentsToProcess) {
                if (payment) {
                    // Skip payment creation if no meaningful payment information is provided
                    const hasCardData = payment.cardData &&
                        payment.cardData.cardNumber &&
                        payment.cardData.cardNumber.trim() !== "";
                    const hasAlternateCardData = payment.alternateCardData &&
                        payment.alternateCardData.cardNumber &&
                        payment.alternateCardData.cardNumber.trim() !== "";
                    const hasPaymentMethod = (payment.paymentMethod && payment.paymentMethod.trim() !== "") ||
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
                        console.log("DEBUG: Skipping payment creation - no meaningful payment data provided");
                        continue;
                    }
                    const parsedAmount = payment.amount && isNaN(parseFloat(payment.amount)) ? parseFloat(payment.amount) : 0;
                    const paymentData = {
                        orderId,
                        provider: payment.provider || "NA",
                        amount: parsedAmount,
                        // payment.amount !== undefined
                        //   ? parseFloat(payment.amount)
                        //   : parseFloat(orderData.totalAmount),
                        currency: payment.currency || "USD",
                        method: payment.paymentMethod || payment.merchantMethod,
                        status: payment.status || "PENDING",
                        paidAt: new Date(),
                        approvelCode: payment.approvelCode || payment.approvalCode,
                        charged: payment.charged,
                        entity: payment.entity || "NA",
                        chargedDate: payment.cardChargedDate
                            ? new Date(payment.cardChargedDate)
                            : null,
                        // Card details with defaults
                        cardHolderName: payment.cardData?.cardholderName || "",
                        cardNumber: payment.cardData?.cardNumber || "",
                        cardCvv: payment.cardData?.securityCode || "",
                        cardExpiry: payment.cardData?.expirationDate
                            ? getCardExpiry(payment.cardData.expirationDate)
                            : new Date(),
                        last4: payment.cardData?.last4 ||
                            payment.cardData?.cardNumber?.slice(-4) ||
                            "",
                        cardBrand: payment.cardData?.brand || "",
                        // Alternate card details with defaults
                        alternateCardHolderName: payment.alternateCardData?.cardholderName || "",
                        alternateCardNumber: payment.alternateCardData?.cardNumber || "",
                        alternateCardCvv: payment.alternateCardData?.securityCode || "",
                        alternateCardExpiry: payment.alternateCardData?.expirationDate
                            ? getCardExpiry(payment.alternateCardData.expirationDate)
                            : null,
                        alternateLast4: payment.alternateCardData?.last4 ||
                            payment.alternateCardData?.cardNumber?.slice(-4) ||
                            "",
                        alternateCardBrand: payment.alternateCardData?.brand || "",
                    };
                    await tx.payment.create({
                        // data: {
                        //   ...paymentData,
                        // } as any,
                        data: paymentData,
                    });
                }
            }
        }
        // 6. Prepare and Update Order
        if (updateData.warranty) {
            const warrantyMap = {
                "30 DAYS": client_1.Warranty.WARRANTY_30_DAYS,
                "60 DAYS": client_1.Warranty.WARRANTY_60_DAYS,
                "90 DAYS": client_1.Warranty.WARRANTY_90_DAYS,
                "6 MONTHS": client_1.Warranty.WARRANTY_6_MONTHS,
                "1 YEAR": client_1.Warranty.WARRANTY_1_YEAR,
            };
            const upperWarranty = updateData.warranty.toUpperCase().replace(" ", "_");
            if (warrantyMap[upperWarranty])
                updateData.warranty = warrantyMap[upperWarranty];
            else if (Object.values(client_1.Warranty).includes(upperWarranty))
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
        if (billingInfo)
            updateData.billingSnapshot = billingInfo;
        if (shippingInfo)
            updateData.shippingSnapshot = shippingInfo;
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
exports.updateOrder = updateOrder;
