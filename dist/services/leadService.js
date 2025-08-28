"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLead = exports.updateLead = exports.getLeadById = exports.syncLeadsFromMeta = exports.processWebhook = exports.createLead = exports.getLeads = void 0;
const client_1 = require("@prisma/client");
const socket_1 = require("../utils/socket");
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
        const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const leadgenEntry = payload.entry[0].changes[0].value;
        const leadgenId = leadgenEntry.leadgen_id;
        const formId = leadgenEntry.form_id;
        const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
        if (!accessToken) {
            throw new Error('Meta Page Access Token is not configured.');
        }
        const response = await fetch(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`);
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
    const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('Meta Page Access Token is not configured.');
    }
    let newLeadsCount = 0;
    // Request field_data and created_time in the paginated request
    let url = `https://graph.facebook.com/v19.0/${formId}/leads?access_token=${accessToken}&fields=id,field_data,created_time&limit=100`;
    while (url) {
        const response = await fetch(url);
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
const getLeadById = async (id) => {
    return await prisma.lead.findUnique({
        where: { id: parseInt(id, 10) },
    });
};
exports.getLeadById = getLeadById;
const updateLead = async (id, data) => {
    return await prisma.lead.update({
        where: { id: parseInt(id, 10) },
        data,
    });
};
exports.updateLead = updateLead;
const deleteLead = async (id) => {
    return await prisma.lead.delete({
        where: { id: parseInt(id, 10) },
    });
};
exports.deleteLead = deleteLead;
