"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLeadsFromMeta = exports.processWebhook = exports.createLead = exports.getLeads = void 0;
const client_1 = require("@prisma/client");
const socket_1 = require("../utils/socket");
const node_fetch_1 = __importDefault(require("node-fetch"));
const prisma = new client_1.PrismaClient();
const getLeads = async () => {
    return await prisma.lead.findMany({
        orderBy: {
            created_at: 'desc',
        },
    });
};
exports.getLeads = getLeads;
const createLead = async (data) => {
    const lead = await prisma.lead.create({
        data: {
            lead_id: data.id,
            form_id: data.form_id,
            data: data.field_data,
        },
    });
    return lead;
};
exports.createLead = createLead;
const processWebhook = async (payload) => {
    try {
        const leadgenEntry = payload.entry[0].changes[0].value;
        const leadgenId = leadgenEntry.leadgen_id;
        const formId = leadgenEntry.form_id;
        const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
        if (!accessToken) {
            throw new Error('Meta Page Access Token is not configured.');
        }
        const response = await (0, node_fetch_1.default)(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch lead data from Meta: ${response.statusText}`);
        }
        const leadData = await response.json();
        const newLead = await prisma.lead.create({
            data: {
                lead_id: leadData.id,
                form_id: formId,
                data: leadData.field_data,
                created_at: leadData.created_time ? new Date(leadData.created_time) : new Date(),
            },
        });
        // Emit a socket event to notify the frontend
        (0, socket_1.getIO)().emit('new-lead', newLead);
        return newLead;
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        throw error;
    }
};
exports.processWebhook = processWebhook;
const syncLeadsFromMeta = async (formId) => {
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('Meta Page Access Token is not configured.');
    }
    let newLeadsCount = 0;
    // Request field_data and created_time in the paginated request
    let url = `https://graph.facebook.com/v19.0/${formId}/leads?access_token=${accessToken}&fields=id,field_data,created_time&limit=100`;
    while (url) {
        const response = await (0, node_fetch_1.default)(url);
        const jsonResponse = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to fetch leads from Meta: ${jsonResponse.error?.message || response.statusText}`);
        }
        const leads = jsonResponse.data;
        if (leads) {
            for (const leadData of leads) {
                const existingLead = await prisma.lead.findUnique({
                    where: { lead_id: leadData.id },
                });
                if (!existingLead) {
                    await prisma.lead.create({
                        data: {
                            lead_id: leadData.id,
                            form_id: formId,
                            data: leadData.field_data,
                            created_at: leadData.created_time ? new Date(leadData.created_time) : new Date(),
                        },
                    });
                    newLeadsCount++;
                }
            }
        }
        url = jsonResponse.paging?.next || '';
    }
    return { newLeadsCount };
};
exports.syncLeadsFromMeta = syncLeadsFromMeta;
