// ======================================
// PROBLEMATIC PART TYPES
// ======================================

export enum ProblematicPartType {
  DAMAGED = "DAMAGED",
  DEFECTIVE = "DEFECTIVE",
  WRONG_PRODUCT = "WRONG_PRODUCT",
}

export interface ProblematicPart {
  id: string;
  orderId: string;
  problemType: ProblematicPartType;

  // Common fields
  requestFromCustomer?: string | null; // "Refund" | "Replacement"
  returnShipping?: string | null; // "Not required" | "Yard Shipping" | "Own Shipping"
  customerRefund?: string | null; // "Yes" | "No"
  yardRefund?: string | null; // "Yes" | "No"
  amount?: number | null; // Customer refund amount
  yardAmount?: number | null; // Yard refund amount
  returnShippingPrice?: number | null; // Only for "Own Shipping"
  productReturned?: string | null; // "Yes" | "No"

  // File uploads
  photos?: string[] | null; // Array of photo URLs
  bolFile?: string | null; // BOL file URL

  // Defective specific
  problemCategory?: string | null; // "Other" | "Damaged" | "Wrong Part" | "Defective" | "Missing"
  description?: string | null; // Description of defective parts
  serviceDocuments?: string[] | null; // Array of service document URLs

  // Wrong product specific
  make?: string | null; // Vehicle make
  model?: string | null; // Vehicle model
  year?: string | null; // Vehicle year
  specification?: string | null; // Part specification

  // Replacement data
  replacement?: ProblematicPartReplacement | null;

  // Metadata
  metadata?: any;
  notes?: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ProblematicPartReplacement {
  id: string;
  problematicPartId: string;

  // Does Yard Have Replacement?
  hasReplacement?: string | null; // "Yes" | "No"

  // If Yes - Re-delivery tracking
  carrierName?: string | null;
  trackingNumber?: string | null;
  eta?: string | null;

  // If No - Yard refund & new yard info
  yardRefund?: string | null; // "Yes" | "No"
  yardRefundAmount?: number | null;

  // New Yard Information
  yardName?: string | null;
  attnName?: string | null;
  yardAddress?: string | null;
  yardPhone?: string | null;
  yardEmail?: string | null;
  warranty?: string | null; // "30 Days" | "60 Days" | "90 Days" | "6 Months" | "1 Year"
  yardMiles?: string | null;
  shipping?: string | null; // "Own Shipping" | "Yard Shipping"

  // Pricing
  replacementPrice?: number | null;
  taxesPrice?: number | null;
  handlingPrice?: number | null;
  processingPrice?: number | null;
  corePrice?: number | null;
  yardCost?: number | null; // Yard shipping cost
  totalBuy?: number | null; // Calculated total

  // PO Status
  pictureStatus?: string | null; // "Yes" | "No"
  poStatus?: string | null;
  poSentAt?: Date | null;
  poConfirmedAt?: Date | null;

  // Re-delivery tracking (for replacement from new yard)
  redeliveryCarrierName?: string | null;
  redeliveryTrackingNumber?: string | null;

  // Metadata
  metadata?: any;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response types
export interface CreateProblematicPartRequest {
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
  photos?: string[];
  bolFile?: string;

  // Defective specific
  problemCategory?: string;
  description?: string;
  serviceDocuments?: string[];

  // Wrong product specific
  make?: string;
  model?: string;
  year?: string;
  specification?: string;

  // Replacement data
  replacement?: CreateProblematicPartReplacementRequest;

  // Metadata
  notes?: string;
  metadata?: any;
}

export interface CreateProblematicPartReplacementRequest {
  hasReplacement?: string;
  carrierName?: string;
  trackingNumber?: string;
  eta?: string;
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
  replacementPrice?: string | number;
  taxesPrice?: string | number;
  handlingPrice?: string | number;
  processingPrice?: string | number;
  corePrice?: string | number;
  yardCost?: string | number;
  pictureStatus?: string;
  poStatus?: string;
  poSentAt?: Date | string;
  poConfirmedAt?: Date | string;
  redeliveryCarrierName?: string;
  redeliveryTrackingNumber?: string;
  metadata?: any;
}

export interface GetAllProblematicPartsResponse {
  items: ProblematicPart[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
