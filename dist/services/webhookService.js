"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookService = void 0;
const prisma_1 = require("./prisma");
exports.webhookService = {
    async saveEvent(provider, eventId, type, payload) {
        try {
            // Check if this event already exists
            const existing = await prisma_1.prisma.webhookEvent.findUnique({
                where: { eventId },
            });
            if (existing) {
                console.log(`ℹ️ Webhook event already exists: ${eventId}`);
                return existing;
            }
            // Create a new record
            const result = await prisma_1.prisma.webhookEvent.create({
                data: {
                    provider,
                    eventId,
                    type,
                    payload,
                },
            });
            console.log(`💾 Webhook saved to DB: ${result.id} (eventId: ${eventId})`);
            return result;
        }
        catch (error) {
            console.error("❌ Error saving webhook to DB:", error.message);
            console.error("Full error:", error);
            throw error;
        }
    },
    async markAsProcessed(eventId) {
        try {
            const updated = await prisma_1.prisma.webhookEvent.update({
                where: { eventId },
                data: { processed: true },
            });
            console.log(`✅ Webhook marked as processed: ${eventId}`);
            return updated;
        }
        catch (error) {
            console.error("❌ Error marking webhook as processed:", error.message);
            throw error;
        }
    },
    // Process payment success and create order
    async processPaymentSuccess(paymentIntent) {
        try {
            console.log("🔍 Processing payment intent:", paymentIntent.id);
            console.log("📋 Metadata:", paymentIntent.metadata);
            // Extract order details from metadata
            const { orderNumber, sessionId, firstName, lastName, address, apartment, city, state, zipCode, country, buyInOneClick, } = paymentIntent.metadata || {};
            const customerEmail = paymentIntent.receipt_email || paymentIntent.metadata?.customerEmail;
            if (!orderNumber) {
                console.error("❌ No order number in payment intent metadata");
                return;
            }
            if (!customerEmail) {
                console.error("❌ No customer email in payment intent");
                return;
            }
            // Check if order already exists
            const existingOrder = await prisma_1.prisma.order.findUnique({
                where: { orderNumber },
            });
            if (existingOrder) {
                console.log(`ℹ️ Order already exists: ${orderNumber}`);
                return existingOrder;
            }
            // Get or create customer
            let customer = await prisma_1.prisma.customer.findFirst({
                where: { email: customerEmail },
            });
            if (!customer) {
                console.log(`📝 Creating new customer: ${customerEmail}`);
                customer = await prisma_1.prisma.customer.create({
                    data: {
                        email: customerEmail,
                        full_name: `${firstName || ''} ${lastName || ''}`.trim() || 'Guest Customer',
                        phone: paymentIntent.metadata?.phone || null,
                    },
                });
            }
            // Get cart items from Redis if sessionId is available
            let cartItems = [];
            let orderTotal = paymentIntent.amount / 100; // Convert from cents
            let subtotal = orderTotal;
            if (sessionId) {
                try {
                    // Import Redis checkout utilities
                    const { getCheckoutData } = require("../utils/redisCheckout");
                    const checkoutData = await getCheckoutData(sessionId);
                    if (checkoutData?.cartItems) {
                        cartItems = checkoutData.cartItems;
                        subtotal = checkoutData.orderTotal?.subtotal || subtotal;
                        orderTotal = checkoutData.orderTotal?.total || orderTotal;
                    }
                }
                catch (redisError) {
                    console.error("⚠️ Could not fetch cart from Redis:", redisError);
                }
            }
            // Build shipping address object for JSON field
            const shippingAddressObj = {
                firstName: firstName || '',
                lastName: lastName || '',
                address: address || '',
                apartment: apartment || '',
                city: city || '',
                state: state || '',
                zipCode: zipCode || '',
                country: country || 'US',
                phone: paymentIntent.metadata?.phone || '',
            };
            // Build shipping address string for text field
            const shippingAddressString = `${firstName || ''} ${lastName || ''}, ${address || ''}, ${apartment ? apartment + ', ' : ''}${city || ''}, ${state || ''} ${zipCode || ''}, ${country || 'US'}`.trim();
            // Create order in database
            const order = await prisma_1.prisma.order.create({
                data: {
                    orderNumber,
                    customerId: customer.id,
                    // Amounts (using Decimal type)
                    subtotal: subtotal,
                    totalAmount: orderTotal,
                    taxesAmount: 0,
                    shippingAmount: 0,
                    // Address data - use BOTH Json snapshot AND string field
                    shippingSnapshot: shippingAddressObj,
                    shippingAddress: shippingAddressString,
                    billingSnapshot: shippingAddressObj, // Same as shipping for now
                    billingAddress: shippingAddressString,
                    // Payment info
                    status: 'PAID',
                    source: 'STOREFRONT',
                    // Metadata
                    metadata: {
                        paymentIntentId: paymentIntent.id,
                        paymentMethod: 'stripe_elements',
                        sessionId: sessionId || null,
                        buyInOneClick: buyInOneClick === 'true',
                    },
                    orderDate: new Date(),
                },
            });
            console.log("✅ Order created in database:", order.id);
            // Create order items if we have cart items
            if (cartItems.length > 0) {
                console.log(`📦 Creating ${cartItems.length} order items...`);
                for (const item of cartItems) {
                    try {
                        await prisma_1.prisma.orderItem.create({
                            data: {
                                orderId: order.id,
                                // Product details from cart
                                makeName: item.make || 'Unknown',
                                modelName: item.model || 'Unknown',
                                yearName: item.year || 'Unknown',
                                partName: item.title || item.name || 'Unknown Part',
                                specification: item.subtitle || item.specification || '',
                                sku: item.id || `TEMP-${Date.now()}`,
                                quantity: item.quantity || 1,
                                unitPrice: item.price || 0,
                                lineTotal: (item.price || 0) * (item.quantity || 1),
                                metadata: {
                                    originalItem: item,
                                },
                            },
                        });
                    }
                    catch (itemError) {
                        console.error(`⚠️ Failed to create order item for ${item.title}:`, itemError);
                    }
                }
                console.log("✅ Order items created");
            }
            // Create payment record
            await prisma_1.prisma.payment.create({
                data: {
                    orderId: order.id,
                    provider: 'stripe',
                    providerPaymentId: paymentIntent.id,
                    amount: orderTotal,
                    currency: paymentIntent.currency.toUpperCase(),
                    method: 'card',
                    status: 'SUCCEEDED',
                    paidAt: new Date(),
                    last4: paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4 || null,
                    cardBrand: paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand || null,
                },
            });
            console.log("✅ Payment record created");
            // Create order event
            await prisma_1.prisma.orderEvent.create({
                data: {
                    orderId: order.id,
                    type: 'payment_succeeded',
                    data: {
                        paymentIntentId: paymentIntent.id,
                        amount: orderTotal,
                    },
                },
            });
            console.log("✅ Order event created");
            // TODO: Send confirmation email here
            // await sendOrderConfirmationEmail(order, customer);
            return order;
        }
        catch (error) {
            console.error("❌ Error processing payment success:", error.message);
            console.error("Stack trace:", error.stack);
            throw error;
        }
    },
};
