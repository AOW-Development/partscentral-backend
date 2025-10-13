"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProblematicPart = exports.updateProblematicPart = exports.getAllProblematicParts = exports.getProblematicPartsByOrderId = exports.getProblematicPartById = exports.createProblematicPart = void 0;
const problematicPartService_1 = require("../services/problematicPartService");
const socket_1 = require("../utils/socket");
// CREATE PROBLEMATIC PART
const createProblematicPart = async (req, res) => {
    try {
        const data = req.body;
        // Validate required fields
        if (!data.orderId) {
            return res.status(400).json({ error: "orderId is required" });
        }
        if (!data.problemType) {
            return res.status(400).json({ error: "problemType is required" });
        }
        // Create problematic part
        const problematicPart = await (0, problematicPartService_1.createProblematicPart)(data);
        // Emit socket event for real-time updates
        const io = (0, socket_1.getIO)();
        io.emit("problematicPartCreated", {
            orderId: data.orderId,
            problematicPart,
        });
        res.status(201).json({
            message: "Problematic part created successfully",
            data: problematicPart,
        });
    }
    catch (error) {
        console.error("Error creating problematic part:", error);
        res.status(500).json({
            error: error.message || "Internal server error",
        });
    }
};
exports.createProblematicPart = createProblematicPart;
// GET PROBLEMATIC PART BY ID
const getProblematicPartById = async (req, res) => {
    try {
        const { id } = req.params;
        const problematicPart = await (0, problematicPartService_1.getProblematicPartById)(id);
        if (!problematicPart) {
            return res.status(404).json({ error: "Problematic part not found" });
        }
        res.status(200).json({
            data: problematicPart,
        });
    }
    catch (error) {
        console.error(`Error fetching problematic part ${req.params.id}:`, error);
        res.status(500).json({
            error: error.message || "Internal server error",
        });
    }
};
exports.getProblematicPartById = getProblematicPartById;
// GET PROBLEMATIC PARTS BY ORDER ID
const getProblematicPartsByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        const problematicParts = await (0, problematicPartService_1.getProblematicPartsByOrderId)(orderId);
        res.status(200).json({
            data: problematicParts,
            count: problematicParts.length,
        });
    }
    catch (error) {
        console.error(`Error fetching problematic parts for order ${req.params.orderId}:`, error);
        res.status(500).json({
            error: error.message || "Internal server error",
        });
    }
};
exports.getProblematicPartsByOrderId = getProblematicPartsByOrderId;
// GET ALL PROBLEMATIC PARTS (with pagination)
const getAllProblematicParts = async (req, res) => {
    try {
        const { page = "1", limit = "10", problemType, orderId, } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const result = await (0, problematicPartService_1.getAllProblematicParts)({
            skip,
            take,
            problemType: problemType,
            orderId,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error fetching all problematic parts:", error);
        res.status(500).json({
            error: error.message || "Internal server error",
        });
    }
};
exports.getAllProblematicParts = getAllProblematicParts;
// UPDATE PROBLEMATIC PART
const updateProblematicPart = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const problematicPart = await (0, problematicPartService_1.updateProblematicPart)(id, data);
        // Emit socket event for real-time updates
        const io = (0, socket_1.getIO)();
        io.emit("problematicPartUpdated", {
            orderId: problematicPart.orderId,
            problematicPart,
        });
        res.status(200).json({
            message: "Problematic part updated successfully",
            data: problematicPart,
        });
    }
    catch (error) {
        console.error(`Error updating problematic part ${req.params.id}:`, error);
        if (error.message.includes("not found")) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({
            error: error.message || "Internal server error",
        });
    }
};
exports.updateProblematicPart = updateProblematicPart;
// DELETE PROBLEMATIC PART
const deleteProblematicPart = async (req, res) => {
    try {
        const { id } = req.params;
        const problematicPart = await (0, problematicPartService_1.deleteProblematicPart)(id);
        // Emit socket event for real-time updates
        const io = (0, socket_1.getIO)();
        io.emit("problematicPartDeleted", {
            orderId: problematicPart.orderId,
            problematicPartId: id,
        });
        res.status(200).json({
            message: "Problematic part deleted successfully",
            data: problematicPart,
        });
    }
    catch (error) {
        console.error(`Error deleting problematic part ${req.params.id}:`, error);
        res.status(500).json({
            error: error.message || "Internal server error",
        });
    }
};
exports.deleteProblematicPart = deleteProblematicPart;
