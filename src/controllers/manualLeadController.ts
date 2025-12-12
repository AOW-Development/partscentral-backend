import { Request, Response } from "express";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
} from "../services/leadService";
import * as XLSX from "xlsx";
import Papa from "papaparse";

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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const result = await getLeads(skip, limit);
    res.status(200).json(result);
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

// Bulk upload leads from CSV/Excel
export const bulkUploadLeadsController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ONLY mandatory fields mapping - these MUST exist in the file
    const mandatoryFieldMapping = {
      lead_source: ["lead_source", "lead source", "source", "Source"],
      created_by: ["created_by", "created by", "lead_owner", "Lead Owner"],
      created_date: [
        "created_date",
        "created date",
        "modified_date",
        "Modified Date",
        "date",
      ],
      part: ["part", "Part", "product_interest", "Product Interest", "product"],
      customer_name: [
        "customer_name",
        "name",
        "Name",
        "Lead Name",
        "lead_name",
      ],
      mobile: ["mobile", "Mobile", "phone", "Phone", "contact"],
      status: ["status", "Status"],
    };

    let data: any[] = [];
    const fileExtension = req.file.originalname.split(".").pop()?.toLowerCase();

    // Parse based on file type
    if (fileExtension === "csv") {
      const csvText = req.file.buffer.toString("utf-8");
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      data = parseResult.data;
    } else if (["xlsx", "xls"].includes(fileExtension || "")) {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return res.status(400).json({
        message: "Invalid file format. Please upload CSV or Excel file.",
      });
    }

    if (data.length === 0) {
      return res.status(400).json({ message: "File is empty or invalid" });
    }

    // Get file headers
    const fileHeaders = Object.keys(data[0]);

    // Check ONLY mandatory fields exist
    const missingFields: string[] = [];
    const foundMandatoryMapping: Record<string, string> = {};

    for (const [requiredField, possibleNames] of Object.entries(
      mandatoryFieldMapping
    )) {
      const foundColumn = possibleNames.find((name) =>
        fileHeaders.includes(name)
      );
      if (foundColumn) {
        foundMandatoryMapping[requiredField] = foundColumn;
      } else {
        missingFields.push(requiredField);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Missing required columns",
        missingFields,
        hint: "Expected columns (any variant)",
        expectedColumns: mandatoryFieldMapping,
      });
    }

    // Create leads in batch
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];

        // Map row data to standardized field names
        const mappedData: any = {};
        const emptyMandatoryFields: string[] = [];

        // Map mandatory fields and check if empty
        for (const [standardField, fileColumn] of Object.entries(
          foundMandatoryMapping
        )) {
          const value = row[fileColumn];
          if (!value || value.toString().trim() === "") {
            emptyMandatoryFields.push(standardField);
          } else {
            mappedData[standardField] = value.toString().trim();
          }
        }

        if (emptyMandatoryFields.length > 0) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: `Empty required fields: ${emptyMandatoryFields.join(", ")}`,
            data: row,
          });
          continue;
        }

        // Import ALL other columns as-is (including billing_address, email, city, etc.)
        const mandatoryColumns = Object.values(foundMandatoryMapping);

        for (const header of fileHeaders) {
          if (!mandatoryColumns.includes(header) && row[header]) {
            const value = row[header];
            if (value && value.toString().trim() !== "") {
              mappedData[header] = value.toString().trim();
            }
          }
        }

        // Create the lead using the same service
        await createLead(mappedData);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: data[i],
        });
      }
    }

    res.status(200).json({
      message: "Bulk upload completed",
      results,
    });
  } catch (error: any) {
    console.error("Error in bulk upload:", error);
    res.status(500).json({
      message: "Error processing bulk upload",
      error: error.message,
    });
  }
};
