import { PrismaClient } from '@prisma/client';
import { getIO } from '../utils/socket';
import { MetaLead, CreateLeadData } from '../types/lead';

const prisma = new PrismaClient();

export const getLeads = async () => {
  return await prisma.lead.findMany({
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const createLead = async (data: CreateLeadData) => {
  const lead = await prisma.lead.create({
    data: {
      lead_id: data.id,
      form_id: data.form_id,
      data: data.field_data as any,
    },
  });
  return lead;
};

export const processWebhook = async (payload: any) => {
  try {
    const fetch = (await import('node-fetch')).default;
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
    
    const leadData: any = await response.json();

    const newLead = await prisma.lead.create({
        data: {
          lead_id: leadData.id,
          form_id: formId,
          data: leadData.field_data as any,
          created_at: leadData.created_time ? new Date(leadData.created_time) : new Date(),
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
    const fetch = (await import('node-fetch')).default;
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('Meta Page Access Token is not configured.');
    }
  
    let newLeadsCount = 0;
    // Request field_data and created_time in the paginated request
    let url = `https://graph.facebook.com/v19.0/${formId}/leads?access_token=${accessToken}&fields=id,field_data,created_time&limit=100`;
  
    while (url) {
      const response = await fetch(url);
      const jsonResponse = await response.json() as {
        data?: MetaLead[];
        paging?: {
          next?: string;
        };
        error?: {
          message: string;
        };
      };
  
      if (!response.ok) {
        throw new Error(`Failed to fetch leads from Meta: ${jsonResponse.error?.message || response.statusText}`);
      }
  
      const leads = jsonResponse.data;
  
      if (leads) {
          for (const leadData of leads as MetaLead[]) {
              const existingLead = await prisma.lead.findUnique({
                where: { lead_id: leadData.id },
              });
        
              if (!existingLead) {
                await prisma.lead.create({
                    data: {
                      lead_id: leadData.id,
                      form_id: formId,
                      data: leadData.field_data as any,
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


export const getLeadById = async (id: string) => {
  return await prisma.lead.findUnique({
    where: { id: parseInt(id, 10) },
  });
};

export const updateLead = async (id: string, data: any) => {
  return await prisma.lead.update({
    where: { id: parseInt(id, 10) },
    data,
  });
};

export const deleteLead = async (id: string) => {
  return await prisma.lead.delete({
    where: { id: parseInt(id, 10) },
  });
};