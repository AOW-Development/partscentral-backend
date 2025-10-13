import { Request, Response } from "express";
import {
  createProblematicPart as createProblematicPartService,
  getProblematicPartById as getProblematicPartByIdService,
  getProblematicPartsByOrderId as getProblematicPartsByOrderIdService,
  updateProblematicPart as updateProblematicPartService,
  deleteProblematicPart as deleteProblematicPartService,
  getAllProblematicParts as getAllProblematicPartsService,
  CreateProblematicPartData,
} from "../services/problematicPartService";
import { getIO } from "../utils/socket";


// CREATE PROBLEMATIC PART


export const createProblematicPart = async (req: Request, res: Response) => {
  try {
    const data: CreateProblematicPartData = req.body;

    // Validate required fields
    if (!data.orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    if (!data.problemType) {
      return res.status(400).json({ error: "problemType is required" });
    }

    // Create problematic part
    const problematicPart = await createProblematicPartService(data);

    // Emit socket event for real-time updates
    const io = getIO();
    io.emit("problematicPartCreated", {
      orderId: data.orderId,
      problematicPart,
    });

    res.status(201).json({
      message: "Problematic part created successfully",
      data: problematicPart,
    });
  } catch (error: any) {
    console.error("Error creating problematic part:", error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};


// GET PROBLEMATIC PART BY ID


export const getProblematicPartById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const problematicPart = await getProblematicPartByIdService(id);

    if (!problematicPart) {
      return res.status(404).json({ error: "Problematic part not found" });
    }

    res.status(200).json({
      data: problematicPart,
    });
  } catch (error: any) {
    console.error(`Error fetching problematic part ${req.params.id}:`, error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};


// GET PROBLEMATIC PARTS BY ORDER ID


export const getProblematicPartsByOrderId = async (
  req: Request,
  res: Response
) => {
  try {
    const { orderId } = req.params;

    const problematicParts = await getProblematicPartsByOrderIdService(orderId);

    res.status(200).json({
      data: problematicParts,
      count: problematicParts.length,
    });
  } catch (error: any) {
    console.error(
      `Error fetching problematic parts for order ${req.params.orderId}:`,
      error
    );
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};


// GET ALL PROBLEMATIC PARTS (with pagination)


export const getAllProblematicParts = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      problemType,
      orderId,
    } = req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const result = await getAllProblematicPartsService({
      skip,
      take,
      problemType: problemType as any,
      orderId,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error fetching all problematic parts:", error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};


// UPDATE PROBLEMATIC PART


export const updateProblematicPart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Partial<CreateProblematicPartData> = req.body;

    const problematicPart = await updateProblematicPartService(id, data);

    // Emit socket event for real-time updates
    const io = getIO();
    io.emit("problematicPartUpdated", {
      orderId: problematicPart.orderId,
      problematicPart,
    });

    res.status(200).json({
      message: "Problematic part updated successfully",
      data: problematicPart,
    });
  } catch (error: any) {
    console.error(`Error updating problematic part ${req.params.id}:`, error);

    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};


// DELETE PROBLEMATIC PART


export const deleteProblematicPart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const problematicPart = await deleteProblematicPartService(id);

    // Emit socket event for real-time updates
    const io = getIO();
    io.emit("problematicPartDeleted", {
      orderId: problematicPart.orderId,
      problematicPartId: id,
    });

    res.status(200).json({
      message: "Problematic part deleted successfully",
      data: problematicPart,
    });
  } catch (error: any) {
    console.error(`Error deleting problematic part ${req.params.id}:`, error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};
