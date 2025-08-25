
import { PrismaClient } from '@prisma/client';
import { getIO } from '../utils/socket';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

export const getLeads = async () => {
  return await prisma.lead.findMany({
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const createLead = async (data: any) => {
  const lead = await prisma.lead.create({
    data: {
      lead_id: data.id,
      form_id: data.form_id,
      data: data.field_data,
    },
  });
  return lead;
};

export const processWebhook = async (payload: any) => {
  try {
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
        },
      });

    // Emit a socket event to notify the frontend
    getIO().emit('new-lead', newLead);

    return newLead;
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
};

export const syncLeadsFromMeta = async (formId: string) => {
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('Meta Page Access Token is not configured.');
    }
  
    let newLeadsCount = 0;
    // Request field_data directly in the paginated request
    let url = `https://graph.facebook.com/v19.0/${formId}/leads?access_token=${accessToken}&fields=field_data&limit=100`;
  
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
                    },
                  });
                  newLeadsCount++;
              }
            }
      }
  
      url = jsonResponse.paging?.next;
    }
  
    return { newLeadsCount };
  };
