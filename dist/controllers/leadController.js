"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLeadsController = exports.webhookController = exports.webhookVerificationController = exports.getLeadsController = void 0;
const leadService_1 = require("../services/leadService");
const getLeadsController = async (req, res) => {
    try {
        const leads = await (0, leadService_1.getLeads)();
        res.status(200).json(leads);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching leads', error });
    }
};
exports.getLeadsController = getLeadsController;
const webhookVerificationController = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
        else {
            res.sendStatus(403);
        }
    }
};
exports.webhookVerificationController = webhookVerificationController;
const webhookController = async (req, res) => {
    try {
        const payload = req.body;
        if (payload.object === 'page') {
            await (0, leadService_1.processWebhook)(payload);
            res.status(200).send('EVENT_RECEIVED');
        }
        else {
            res.sendStatus(404);
        }
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Error processing webhook');
    }
};
exports.webhookController = webhookController;
const syncLeadsController = async (req, res) => {
    try {
        const { formId } = req.body;
        if (!formId) {
            return res.status(400).json({ message: 'formId is required' });
        }
        const result = await (0, leadService_1.syncLeadsFromMeta)(formId);
        res.status(200).json(result);
    }
    catch (error) {
        const err = error;
        console.error('Error syncing leads:', err);
        res.status(500).json({ message: 'Error syncing leads', error: err.message });
    }
};
exports.syncLeadsController = syncLeadsController;
