import { Request, Response } from "express";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
} from "../services/leadService";

// Create manual lead
export const createLeadController = async (req: Request, res: Response) => {
  try {
    const lead = await createLead(req.body); // accept object directly
    res.status(201).json(lead);
  } catch (error: any) {
    console.error("Error creating lead:", error);
    res
      .status(500)
      .json({ message: "Error creating lead", error: error.message });
  }
};

// Get all leads
export const getAllLeadsController = async (req: Request, res: Response) => {
  try {
    const leads = await getLeads();
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leads" });
  }
};

// Get lead by ID
export const getLeadByIdController = async (req: Request, res: Response) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ message: "Error fetching lead" });
  }
};

// Update lead by ID
export const updateLeadController = async (req: Request, res: Response) => {
  try {
    const updated = await updateLead(req.params.id, req.body); // accept object directly
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating lead" });
  }
};

// Delete lead by ID
export const deleteLeadController = async (req: Request, res: Response) => {
  try {
    await deleteLead(req.params.id);
    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting lead" });
  }
};
