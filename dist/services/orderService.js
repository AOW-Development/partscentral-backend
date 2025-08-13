"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createOrder = async (payload) => {
    const { billingInfo, shippingInfo, customerInfo, cartItems, paymentInfo, totalAmount, subtotal } = payload;
    return prisma.$transaction(async (tx) => {
        // 1. Find or Create Customer
        let customer = await tx.customer.findUnique({
            where: { email: customerInfo.email },
        });
        if (!customer) {
            customer = await tx.customer.create({
                data: {
                    email: customerInfo.email,
                    full_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
                    // Add other customer fields as necessary from customerInfo
                },
            });
        }
        // 2. Create Address (for both billing and shipping, or separate if needed)
        const newAddress = await tx.address.create({
            data: {
                addressType: client_1.AddressType.RESIDENTIAL, // Assuming residential for now, can be dynamic
                shippingInfo: shippingInfo,
                billingInfo: billingInfo,
                companyName: shippingInfo.company || billingInfo.company || null,
            },
        });
        // 3. Create Order
        const order = await tx.order.create({
            data: {
                orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Generate unique order number
                customerId: customer.id,
                source: client_1.OrderSource.STOREFRONT,
                status: client_1.OrderStatus.PENDING, // Will update to PAID after payment processing
                subtotal: subtotal,
                totalAmount: totalAmount,
                billingSnapshot: billingInfo,
                shippingSnapshot: shippingInfo,
                addressId: newAddress.id,
                addressType: client_1.AddressType.RESIDENTIAL, // Assuming residential for now
                // Add other order fields as necessary
            },
        });
        // 4. Create Order Items
        for (const item of cartItems) {
            // Need to fetch product details to get makeName, modelName, yearName, partName, specification, product_id
            const productVariant = await tx.productVariant_1.findUnique({
                where: { id: item.id }, // Assuming item.id is productVariantId
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
                throw new Error(`Product variant with ID ${item.id} not found.`);
            }
            const product = productVariant.product;
            const makeName = product.modelYear.model.make.name;
            const modelName = product.modelYear.model.name;
            const yearName = product.modelYear.year.value;
            const partName = product.partType.name;
            const specification = product.description || ''; // Assuming description can be specification
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
                    source: client_1.OrderSource.STOREFRONT,
                    status: client_1.OrderStatus.PENDING,
                },
            });
        }
        // 5. Create Payment
        // Assuming paymentInfo contains card details for now.
        // The schema has cardCvv, cardNumber, cardExpiry, cardHolderName, cardBrand.
        // Frontend paymentInfo has cardNumber, cardholderName, expirationDate, securityCode.
        // Need to map these. expirationDate is MM/YY, cardExpiry is DateTime.
        const [expMonth, expYear] = paymentInfo.cardData.expirationDate.split('/');
        const cardExpiryDate = new Date(parseInt(`20${expYear}`), parseInt(expMonth) - 1, 1); // First day of the month
        await tx.payment.create({
            data: {
                orderId: order.id,
                provider: paymentInfo.paymentMethod, // e.g., 'card', 'paypal'
                amount: totalAmount,
                currency: 'USD',
                method: paymentInfo.paymentMethod,
                status: client_1.PaymentStatus.SUCCEEDED, // Assuming payment is successful at this point
                paidAt: new Date(),
                cardHolderName: paymentInfo.cardData.cardholderName,
                cardNumber: paymentInfo.cardData.cardNumber,
                cardCvv: paymentInfo.cardData.securityCode,
                cardExpiry: cardExpiryDate,
                // cardBrand: 'Visa', // This might need to be determined from card number
                entity: 'order', // Assuming 'order' as entity
            },
        });
        // Update order status to PAID
        const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: { status: client_1.OrderStatus.PAID },
            include: {
                customer: true,
                items: true,
            },
        });
        return updatedOrder;
    });
};
exports.createOrder = createOrder;
