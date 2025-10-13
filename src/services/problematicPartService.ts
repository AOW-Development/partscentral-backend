import {
  PrismaClient,
  ProblematicPart,
  ProblematicPartReplacement,
  ProblematicPartType,
  Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();


// TYPE DEFINITIONS


export interface CreateProblematicPartData {
  orderId: string;
  problemType: "damaged" | "defective" | "wrong";

  // Common fields
  requestFromCustomer?: string;
  returnShipping?: string;
  customerRefund?: string;
  yardRefund?: string;
  amount?: string | number;
  yardAmount?: string | number;
  returnShippingPrice?: string | number;
  productReturned?: string;
  photos?: string[]; // Array of photo URLs
  bolFile?: string;

  // Defective specific
  problemCategory?: string;
  description?: string;
  serviceDocuments?: string[]; // Array of document URLs

  // Wrong product specific
  make?: string;
  model?: string;
  year?: string;
  specification?: string;

  // Replacement data
  replacement?: CreateReplacementData;

  // Metadata
  notes?: string;
  metadata?: any;
}

export interface CreateReplacementData {
  hasReplacement?: string;

  // If Yes - Re-delivery tracking
  carrierName?: string;
  trackingNumber?: string;
  eta?: string;

  // If No - Yard refund & new yard info
  yardRefund?: string;
  yardRefundAmount?: string | number;
  yardName?: string;
  attnName?: string;
  yardAddress?: string;
  yardPhone?: string;
  yardEmail?: string;
  warranty?: string;
  yardMiles?: string;
  shipping?: string;

  // Pricing
  replacementPrice?: string | number;
  taxesPrice?: string | number;
  handlingPrice?: string | number;
  processingPrice?: string | number;
  corePrice?: string | number;
  yardCost?: string | number;

  // PO Status
  pictureStatus?: string;
  poStatus?: string;
  poSentAt?: Date | string;
  poConfirmedAt?: Date | string;

  // Re-delivery tracking
  redeliveryCarrierName?: string;
  redeliveryTrackingNumber?: string;

  metadata?: any;
}


// HELPER FUNCTIONS


/**
 * Maps frontend problem type to Prisma enum
 */
function mapProblemType(type: string): ProblematicPartType {
  const typeMap: Record<string, ProblematicPartType> = {
    damaged: "DAMAGED",
    defective: "DEFECTIVE",
    wrong: "WRONG_PRODUCT",
  };

  return typeMap[type.toLowerCase()] || "DAMAGED";
}

/**
 * Converts string/number to Decimal for Prisma
 */
function toDecimal(value?: string | number): Prisma.Decimal | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return new Prisma.Decimal(value.toString());
}

/**
 * Calculates total buy for replacement
 */
function calculateTotalBuy(replacement: CreateReplacementData): Prisma.Decimal {
  const price = Number(replacement.replacementPrice) || 0;
  const taxes = Number(replacement.taxesPrice) || 0;
  const handling = Number(replacement.handlingPrice) || 0;
  const processing = Number(replacement.processingPrice) || 0;
  const core = Number(replacement.corePrice) || 0;
  const cost = Number(replacement.yardCost) || 0;

  return new Prisma.Decimal(
    price + taxes + handling + processing + core + cost
  );
}


// INTERNAL UPDATE FUNCTION (for transactions)


async function updateProblematicPartInternal(
  tx: any,
  id: string,
  data: Partial<CreateProblematicPartData>
): Promise<ProblematicPart> {
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
    } else {
      // Create new replacement
      await tx.problematicPartReplacement.create({
        data: {
          problematicPart: { connect: { id } },
          ...replacementPayload,
        },
      });
    }
  } else if (data.requestFromCustomer === "Refund") {
    // If changed to Refund, delete any existing replacement
    await tx.problematicPartReplacement.deleteMany({
      where: { problematicPartId: id },
    });
  }

  // Return updated part with replacement
  return tx.problematicPart.findUnique({
    where: { id },
    include: { replacement: true },
  }) as Promise<ProblematicPart>;
}


// CREATE PROBLEMATIC PART


export const createProblematicPart = async (
  data: CreateProblematicPartData
): Promise<ProblematicPart> => {
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
      console.log(
        `Problematic part already exists for order ${data.orderId}, updating instead...`
      );
      return updateProblematicPartInternal(tx, existingPart.id, data);
    }

    // Prepare problematic part data
    const problematicPartData: Prisma.ProblematicPartCreateInput = {
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
    }) as Promise<ProblematicPart>;
  });
};


// GET PROBLEMATIC PART BY ID


export const getProblematicPartById = async (
  id: string
): Promise<ProblematicPart | null> => {
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


// GET PROBLEMATIC PARTS BY ORDER ID


export const getProblematicPartsByOrderId = async (
  orderId: string
): Promise<ProblematicPart[]> => {
  return prisma.problematicPart.findMany({
    where: { orderId },
    include: { replacement: true },
    orderBy: { createdAt: "desc" },
  });
};


// UPDATE PROBLEMATIC PART
export const updateProblematicPart = async (
  id: string,
  data: Partial<CreateProblematicPartData>
): Promise<ProblematicPart> => {
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


// DELETE PROBLEMATIC PART
export const deleteProblematicPart = async (
  id: string
): Promise<ProblematicPart> => {
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


// GET ALL PROBLEMATIC PARTS (with pagination)


export const getAllProblematicParts = async (params: {
  skip?: number;
  take?: number;
  problemType?: ProblematicPartType;
  orderId?: string;
}) => {
  const { skip = 0, take = 10, problemType, orderId } = params;

  const where: Prisma.ProblematicPartWhereInput = {};
  if (problemType) where.problemType = problemType;
  if (orderId) where.orderId = orderId;

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
