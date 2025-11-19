"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookController = void 0;
const webhookService_1 = require("../services/webhookService");
// export const webhookController = {
//   async handle(req: Request, res: Response) {
//     console.log(" Webhook received at:", new Date().toISOString());
//     console.log(" Request body:", JSON.stringify(req.body, null, 2));
//     try {
//       const { provider, eventId, type, payload } = req.body;
//       if (!provider || !eventId || !type || !payload) {
//         console.log("Missing required fields:");
//         console.log(`  - provider: ${provider ? '✓' : '✗'}`);
//         console.log(`  - eventId: ${eventId ? '✓' : '✗'}`);
//         console.log(`  - type: ${type ? '✓' : '✗'}`);
//         console.log(`  - payload: ${payload ? '✓' : '✗'}`);
//         return res.status(400).json({ error: "Invalid webhook payload" });
//       }
//       console.log(` Processing ${provider} event: ${type} (${eventId})`);
//       //  Save webhook event to DB
//       const saved = await webhookService.saveEvent(provider, eventId, type, payload);
//       console.log(` Webhook event saved successfully:`, {
//         id: saved.id,
//         eventId: saved.eventId,
//         type: saved.type,
//         receivedAt: saved.receivedAt
//       });
//       if (type === 'payment_intent.succeeded') {
//         console.log("💳 Payment succeeded - processing order creation...");
//         try {
//           await webhookService.processPaymentSuccess(payload.object);
//           console.log("✅ Order processed successfully");
//         } catch (processError: any) {
//           console.error("❌ Error processing payment success:", processError.message);
//           // Don't fail the webhook - we already saved it
//         }
//       }
//       await webhookService.markAsProcessed(eventId);
//       return res.status(200).json({ 
//         success: true,
//         id: saved.id,
//         eventId: saved.eventId
//       });
//     } catch (err: any) {
//       console.error(" Error in webhookController:", err.message);
//       console.error("Stack trace:", err.stack);
//       return res.status(500).json({ 
//         error: "Internal server error",
//         message: err.message 
//       });
//     }
//   },
// };
exports.webhookController = {
    async handle(req, res) {
        console.log("🔔 Webhook received at:", new Date().toISOString());
        try {
            const { provider, eventId, type, payload } = req.body;
            if (!provider || !eventId || !type || !payload) {
                return res.status(400).json({ error: "Invalid webhook payload" });
            }
            // Save webhook event to DB
            const saved = await webhookService_1.webhookService.saveEvent(provider, eventId, type, payload);
            console.log(`✅ Webhook event saved: ${saved.id}`);
            // Process payment_intent.succeeded events
            if (type === 'payment_intent.succeeded') {
                console.log("💳 Payment succeeded - processing order...");
                try {
                    await webhookService_1.webhookService.processPaymentSuccess(payload.object);
                    console.log("✅ Order processed successfully");
                }
                catch (processError) {
                    console.error("❌ Error processing payment:", processError.message);
                    // Don't fail the webhook - we already saved it
                }
            }
            // Mark as processed
            await webhookService_1.webhookService.markAsProcessed(eventId);
            return res.status(200).json({
                success: true,
                id: saved.id,
                eventId: saved.eventId
            });
        }
        catch (err) {
            console.error("❌ Webhook error:", err.message);
            return res.status(500).json({ error: err.message });
        }
    },
};
