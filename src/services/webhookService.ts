import { prisma } from "./prisma";

export const webhookService = {
  async saveEvent(provider: string, eventId: string, type: string, payload: any) {
    try {
      // 🔍 1. Check if this event already exists
      const existing = await prisma.webhookEvent.findUnique({
        where: { eventId },
      });

      if (existing) {
        console.log(` Webhook event already exists: ${eventId}`);
        return existing;
      }

      // 💾 2. Create a new record - Prisma auto-generates the ID with cuid()
      const result = await prisma.webhookEvent.create({
        data: {
          provider,
          eventId,
          type,
          payload,
        },
      });

      console.log(` Webhook saved to DB: ${result.id} (eventId: ${eventId})`);
      return result;
    } catch (error: any) {
      console.error(" Error saving webhook to DB:", error.message);
      console.error("Full error:", error);
      throw error;
    }
  },

  async markAsProcessed(eventId: string) {
    try {
      const updated = await prisma.webhookEvent.update({
        where: { eventId },
        data: { processed: true },
      });
      console.log(` Webhook marked as processed: ${eventId}`);
      return updated;
    } catch (error: any) {
      console.error(" Error marking webhook as processed:", error.message);
      throw error;
    }
  },
};