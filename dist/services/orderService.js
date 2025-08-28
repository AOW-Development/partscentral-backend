"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderById = exports.getOrders = exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createOrder = async (payload) => {
    try {
        const { billingInfo, shippingInfo, customerInfo, cartItems, paymentInfo, totalAmount, subtotal, orderNumber, source, status, year, saleMadeBy, notes, vinNumber, orderDate, carrierName, trackingNumber, customerNotes, yardNotes, shippingAddress, billingAddress, taxesAmount, shippingAmount, handlingFee, processingFee, corePrice, milesPromised, addressType, companyName, poStatus, poSentAt, poConfirmAt, yardInfo, metadata, idempotencyKey, } = payload;
        const mappedAddressType = typeof addressType === 'string'
            ? client_1.AddressType[addressType.toUpperCase()]
            : addressType;
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
                    addressType: mappedAddressType || client_1.AddressType.RESIDENTIAL,
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
                    source: source || client_1.OrderSource.STOREFRONT,
                    status: status || client_1.OrderStatus.PENDING,
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
                    companyName: companyName || shippingInfo.company || billingInfo.company || null,
                    billingSnapshot: billingInfo,
                    shippingSnapshot: shippingInfo,
                    addressId: newAddress.id,
                    addressType: mappedAddressType || client_1.AddressType.RESIDENTIAL,
                    customerNotes: customerNotes ? (typeof customerNotes === 'string' ? JSON.parse(customerNotes) : customerNotes) : null,
                    yardNotes: yardNotes ? (typeof yardNotes === 'string' ? JSON.parse(yardNotes) : yardNotes) : null,
                    taxesAmount: taxesAmount ? parseFloat(taxesAmount.toString()) : null,
                    shippingAmount: shippingAmount ? parseFloat(shippingAmount.toString()) : null,
                    handlingFee: handlingFee ? parseFloat(handlingFee.toString()) : null,
                    processingFee: processingFee ? parseFloat(processingFee.toString()) : null,
                    corePrice: corePrice ? parseFloat(corePrice.toString()) : null,
                    milesPromised: milesPromised ? parseFloat(milesPromised.toString()) : null,
                    poStatus,
                    poSentAt: poSentAt ? new Date(poSentAt) : null,
                    poConfirmAt: poConfirmAt ? new Date(poConfirmAt) : null,
                    metadata: metadata || null,
                    idempotencyKey: idempotencyKey || null,
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
                            specification: item.specification || specification,
                            pictureUrl: item.pictureUrl || null,
                            pictureStatus: item.pictureStatus || null,
                            // metadata: item.warranty ? { warranty: item.warranty, milesPromised: item.milesPromised } : null,
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
                        provider: paymentInfo.provider || 'NA',
                        amount: totalAmount,
                        currency: paymentInfo.currency || 'USD',
                        method: paymentInfo.paymentMethod,
                        status: client_1.PaymentStatus.SUCCEEDED,
                        paidAt: new Date(),
                        cardHolderName: paymentInfo.cardData.cardholderName,
                        cardNumber: paymentInfo.cardData.cardNumber,
                        cardCvv: paymentInfo.cardData.securityCode,
                        cardExpiry: cardExpiryDate,
                        last4: paymentInfo.cardData.last4 || paymentInfo.cardData.cardNumber?.slice(-4),
                        cardBrand: paymentInfo.cardData.brand,
                        approvelCode: paymentInfo.approvelCode,
                        charged: paymentInfo.charged,
                        entity: paymentInfo.entity || 'NA',
                    },
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
            const finalStatus = paymentInfo ? client_1.OrderStatus.PAID : client_1.OrderStatus.PENDING;
            const updatedOrder = await tx.order.update({
                where: { id: order.id },
                data: { status: finalStatus },
                include: {
                    customer: true,
                    items: true,
                    yardInfo: true,
                },
            });
            return updatedOrder;
        });
    }
    catch (err) {
        console.error('OrderService error:', err, payload);
        throw err;
    }
};
exports.createOrder = createOrder;
const getOrders = async () => {
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
    }
    catch (err) {
        console.error('Error fetching orders:', err);
        throw err;
    }
};
exports.getOrders = getOrders;
const getOrderById = async (orderId) => {
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
    }
    catch (err) {
        console.error(`Error fetching order ${orderId}:`, err);
        throw err;
    }
};
exports.getOrderById = getOrderById;
