import { Request, Response } from "express";
import { webhookService } from "../services/webhookService";

export const webhookController = {
  async handle(req: Request, res: Response) {
    console.log(" Webhook received at:", new Date().toISOString());
    console.log(" Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      const { provider, eventId, type, payload } = req.body;

      if (!provider || !eventId || !type || !payload) {
        console.log("Missing required fields:");
        console.log(`  - provider: ${provider ? '✓' : '✗'}`);
        console.log(`  - eventId: ${eventId ? '✓' : '✗'}`);
        console.log(`  - type: ${type ? '✓' : '✗'}`);
        console.log(`  - payload: ${payload ? '✓' : '✗'}`);
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      console.log(` Processing ${provider} event: ${type} (${eventId})`);

      //  Save webhook event to DB
      const saved = await webhookService.saveEvent(provider, eventId, type, payload);

      console.log(` Webhook event saved successfully:`, {
        id: saved.id,
        eventId: saved.eventId,
        type: saved.type,
        receivedAt: saved.receivedAt
      });

      return res.status(200).json({ 
        success: true,
        id: saved.id,
        eventId: saved.eventId
      });
    } catch (err: any) {
      console.error(" Error in webhookController:", err.message);
      console.error("Stack trace:", err.stack);
      return res.status(500).json({ 
        error: "Internal server error",
        message: err.message 
      });
    }
  },
};