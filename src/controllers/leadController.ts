
import { Request, Response } from 'express';
import {
  getLeads,
  processWebhook,
  syncLeadsFromMeta,
} from '../services/leadService';

export const getLeadsController = async (req: Request, res: Response) => {
  try {
    const leads = await getLeads();
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leads', error });
  }
};

export const webhookVerificationController = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
};

export const webhookController = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (payload.object === 'page') {
      await processWebhook(payload);
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
};

export const syncLeadsController = async (req: Request, res: Response) => {
    try {
      const { formId } = req.body;
      if (!formId) {
        return res.status(400).json({ message: 'formId is required' });
      }
      const result = await syncLeadsFromMeta(formId);
      res.status(200).json(result);
    } catch (error) {
        const err = error as Error;
        console.error('Error syncing leads:', err);
        res.status(500).json({ message: 'Error syncing leads', error: err.message });
    }
  };
