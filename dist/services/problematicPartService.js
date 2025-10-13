"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProblematicParts = exports.deleteProblematicPart = exports.updateProblematicPart = exports.getProblematicPartsByOrderId = exports.getProblematicPartById = exports.createProblematicPart = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// HELPER FUNCTIONS
/**
 * Maps frontend problem type to Prisma enum
 */
function mapProblemType(type) {
    const typeMap = {
        damaged: "DAMAGED",
        defective: "DEFECTIVE",
        wrong: "WRONG_PRODUCT",
    };
    return typeMap[type.toLowerCase()] || "DAMAGED";
}
/**
 * Converts string/number to Decimal for Prisma
 */
function toDecimal(value) {
    if (value === undefined || value === null || value === "")
        return undefined;
    return new client_1.Prisma.Decimal(value.toString());
}
/**
 * Calculates total buy for replacement
 */
function calculateTotalBuy(replacement) {
    const price = Number(replacement.replacementPrice) || 0;
    const taxes = Number(replacement.taxesPrice) || 0;
    const handling = Number(replacement.handlingPrice) || 0;
    const processing = Number(replacement.processingPrice) || 0;
    const core = Number(replacement.corePrice) || 0;
    const cost = Number(replacement.yardCost) || 0;
    return new client_1.Prisma.Decimal(price + taxes + handling + processing + core + cost);
}
// INTERNAL UPDATE FUNCTION (for transactions)
async function updateProblematicPartInternal(tx, id, data) {
    // Update problematic part
    const updatedPart = await tx.problematicPart.update({
        where: { id },
        data: {
            problemType: data.problemType
                ? mapProblemType(data.problemType)
                : undefined,
            requestFromCustomer: data.requestFromCustomer,
            returnShipping: data.returnShipping,
            customerRefund: data.customerRefund,
            yardRefund: data.yardRefund,
            amount: toDecimal(data.amount),
            yardAmount: toDecimal(data.yardAmount),
            returnShippingPrice: toDecimal(data.returnShippingPrice),
            productReturned: data.productReturned,
            photos: data.photos ? JSON.parse(JSON.stringify(data.photos)) : undefined,
            bolFile: data.bolFile,
            problemCategory: data.problemCategory,
            description: data.description,
            serviceDocuments: data.serviceDocuments
                ? JSON.parse(JSON.stringify(data.serviceDocuments))
                : undefined,
            make: data.make,
            model: data.model,
            year: data.year,
            specification: data.specification,
            notes: data.notes,
            metadata: data.metadata
                ? JSON.parse(JSON.stringify(data.metadata))
                : undefined,
        },
    });
    // Handle replacement
    if (data.replacement && data.requestFromCustomer === "Replacement") {
        const replacementData = data.replacement;
        const existing = await tx.problematicPartReplacement.findUnique({
            where: { problematicPartId: id },
        });
        const replacementPayload = {
            hasReplacement: replacementData.hasReplacement,
            carrierName: replacementData.carrierName,
            trackingNumber: replacementData.trackingNumber,
            eta: replacementData.eta,
            yardRefund: replacementData.yardRefund,
            yardRefundAmount: toDecimal(replacementData.yardRefundAmount),
            yardName: replacementData.yardName,
            attnName: replacementData.attnName,
            yardAddress: replacementData.yardAddress,
            yardPhone: replacementData.yardPhone,
            yardEmail: replacementData.yardEmail,
            warranty: replacementData.warranty,
            yardMiles: replacementData.yardMiles,
            shipping: replacementData.shipping,
            replacementPrice: toDecimal(replacementData.replacementPrice),
            taxesPrice: toDecimal(replacementData.taxesPrice),
            handlingPrice: toDecimal(replacementData.handlingPrice),
            processingPrice: toDecimal(replacementData.processingPrice),
            corePrice: toDecimal(replacementData.corePrice),
            yardCost: toDecimal(replacementData.yardCost),
            totalBuy: calculateTotalBuy(replacementData),
            pictureStatus: replacementData.pictureStatus,
            poStatus: replacementData.poStatus,
            poSentAt: replacementData.poSentAt
                ? new Date(replacementData.poSentAt)
                : undefined,
            poConfirmedAt: replacementData.poConfirmedAt
                ? new Date(replacementData.poConfirmedAt)
                : undefined,
            redeliveryCarrierName: replacementData.redeliveryCarrierName,
            redeliveryTrackingNumber: replacementData.redeliveryTrackingNumber,
            metadata: replacementData.metadata
                ? JSON.parse(JSON.stringify(replacementData.metadata))
                : undefined,
        };
        if (existing) {
            // Update existing replacement
            await tx.problematicPartReplacement.update({
                where: { problematicPartId: id },
                data: replacementPayload,
            });
        }
        else {
            // Create new replacement
            await tx.problematicPartReplacement.create({
                data: {
                    problematicPart: { connect: { id } },
                    ...replacementPayload,
                },
            });
        }
    }
    else if (data.requestFromCustomer === "Refund") {
        // If changed to Refund, delete any existing replacement
        await tx.problematicPartReplacement.deleteMany({
            where: { problematicPartId: id },
        });
    }
    // Return updated part with replacement
    return tx.problematicPart.findUnique({
        where: { id },
        include: { replacement: true },
    });
}
// CREATE PROBLEMATIC PART
const createProblematicPart = async (data) => {
    return prisma.$transaction(async (tx) => {
        // Verify order exists
        const order = await tx.order.findUnique({
            where: { id: data.orderId },
        });
        if (!order) {
            throw new Error(`Order with ID ${data.orderId} not found.`);
        }
        // Check if problematic part already exists for this order
        // Using findFirst since unique constraint may not be applied yet
        const existingPart = await tx.problematicPart.findFirst({
            where: { orderId: data.orderId },
            include: { replacement: true },
        });
        // If exists, update instead of create (one problematic part per order)
        if (existingPart) {
            console.log(`Problematic part already exists for order ${data.orderId}, updating instead...`);
            return updateProblematicPartInternal(tx, existingPart.id, data);
        }
        // Prepare problematic part data
        const problematicPartData = {
            order: { connect: { id: data.orderId } },
            problemType: mapProblemType(data.problemType),
            // Common fields
            requestFromCustomer: data.requestFromCustomer,
            returnShipping: data.returnShipping,
            customerRefund: data.customerRefund,
            yardRefund: data.yardRefund,
            amount: toDecimal(data.amount),
            yardAmount: toDecimal(data.yardAmount),
            returnShippingPrice: toDecimal(data.returnShippingPrice),
            productReturned: data.productReturned,
            // File uploads
            photos: data.photos ? JSON.parse(JSON.stringify(data.photos)) : undefined,
            bolFile: data.bolFile,
            // Defective specific
            problemCategory: data.problemCategory,
            description: data.description,
            serviceDocuments: data.serviceDocuments
                ? JSON.parse(JSON.stringify(data.serviceDocuments))
                : undefined,
            // Wrong product specific
            make: data.make,
            model: data.model,
            year: data.year,
            specification: data.specification,
            // Metadata
            notes: data.notes,
            metadata: data.metadata
                ? JSON.parse(JSON.stringify(data.metadata))
                : undefined,
        };
        // Create problematic part
        const problematicPart = await tx.problematicPart.create({
            data: problematicPartData,
        });
        // Create replacement if provided
        if (data.replacement && data.requestFromCustomer === "Replacement") {
            const replacementData = data.replacement;
            await tx.problematicPartReplacement.create({
                data: {
                    problematicPart: { connect: { id: problematicPart.id } },
                    hasReplacement: replacementData.hasReplacement,
                    // Re-delivery tracking
                    carrierName: replacementData.carrierName,
                    trackingNumber: replacementData.trackingNumber,
                    eta: replacementData.eta,
                    // Yard refund
                    yardRefund: replacementData.yardRefund,
                    yardRefundAmount: toDecimal(replacementData.yardRefundAmount),
                    // New yard info
                    yardName: replacementData.yardName,
                    attnName: replacementData.attnName,
                    yardAddress: replacementData.yardAddress,
                    yardPhone: replacementData.yardPhone,
                    yardEmail: replacementData.yardEmail,
                    warranty: replacementData.warranty,
                    yardMiles: replacementData.yardMiles,
                    shipping: replacementData.shipping,
                    // Pricing
                    replacementPrice: toDecimal(replacementData.replacementPrice),
                    taxesPrice: toDecimal(replacementData.taxesPrice),
                    handlingPrice: toDecimal(replacementData.handlingPrice),
                    processingPrice: toDecimal(replacementData.processingPrice),
                    corePrice: toDecimal(replacementData.corePrice),
                    yardCost: toDecimal(replacementData.yardCost),
                    totalBuy: calculateTotalBuy(replacementData),
                    // PO Status
                    pictureStatus: replacementData.pictureStatus,
                    poStatus: replacementData.poStatus,
                    poSentAt: replacementData.poSentAt
                        ? new Date(replacementData.poSentAt)
                        : undefined,
                    poConfirmedAt: replacementData.poConfirmedAt
                        ? new Date(replacementData.poConfirmedAt)
                        : undefined,
                    // Re-delivery tracking
                    redeliveryCarrierName: replacementData.redeliveryCarrierName,
                    redeliveryTrackingNumber: replacementData.redeliveryTrackingNumber,
                    // Metadata
                    metadata: replacementData.metadata
                        ? JSON.parse(JSON.stringify(replacementData.metadata))
                        : undefined,
                },
            });
        }
        // Return created problematic part with replacement data
        return tx.problematicPart.findUnique({
            where: { id: problematicPart.id },
            include: { replacement: true },
        });
    });
};
exports.createProblematicPart = createProblematicPart;
// GET PROBLEMATIC PART BY ID
const getProblematicPartById = async (id) => {
    return prisma.problematicPart.findUnique({
        where: { id },
        include: {
            replacement: true,
            order: {
                include: {
                    customer: true,
                },
            },
        },
    });
};
exports.getProblematicPartById = getProblematicPartById;
// GET PROBLEMATIC PARTS BY ORDER ID
const getProblematicPartsByOrderId = async (orderId) => {
    return prisma.problematicPart.findMany({
        where: { orderId },
        include: { replacement: true },
        orderBy: { createdAt: "desc" },
    });
};
exports.getProblematicPartsByOrderId = getProblematicPartsByOrderId;
// UPDATE PROBLEMATIC PART
const updateProblematicPart = async (id, data) => {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.problematicPart.findUnique({
            where: { id },
            include: { replacement: true },
        });
        if (!existing) {
            throw new Error(`Problematic part with ID ${id} not found.`);
        }
        // Use internal update function
        return updateProblematicPartInternal(tx, id, data);
    });
};
exports.updateProblematicPart = updateProblematicPart;
// DELETE PROBLEMATIC PART
const deleteProblematicPart = async (id) => {
    return prisma.$transaction(async (tx) => {
        // Delete replacement first (if exists)
        await tx.problematicPartReplacement.deleteMany({
            where: { problematicPartId: id },
        });
        // Delete problematic part
        return tx.problematicPart.delete({
            where: { id },
        });
    });
};
exports.deleteProblematicPart = deleteProblematicPart;
// GET ALL PROBLEMATIC PARTS (with pagination)
const getAllProblematicParts = async (params) => {
    const { skip = 0, take = 10, problemType, orderId } = params;
    const where = {};
    if (problemType)
        where.problemType = problemType;
    if (orderId)
        where.orderId = orderId;
    const [items, total] = await Promise.all([
        prisma.problematicPart.findMany({
            where,
            skip,
            take,
            include: {
                replacement: true,
                order: {
                    include: {
                        customer: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.problematicPart.count({ where }),
    ]);
    return {
        items,
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
    };
};
exports.getAllProblematicParts = getAllProblematicParts;
