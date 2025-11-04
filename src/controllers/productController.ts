import { error } from "console";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const productService = require("../services/productService");
const prisma = new PrismaClient();

exports.createListing = async (req: Request, res: Response) => {
  try {
    const { make, model, year, part, specification } = req.body || {};
    if (!make || !model || !year || !part) {
      return res
        .status(400)
        .json({ error: "make, model, year and part are required" });
    }
    const result = await productService.createListing({
      make,
      model,
      year,
      part,
      specification,
    });
    res.status(201).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

exports.deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const result = await productService.deleteProduct(productId);
    res.status(200).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

exports.getProductsByVehicle = async (req: Request, res: Response) => {
  const { make, model, year, part } = req.query;
  try {
    const products = await productService.getProductsByVehicle({
      make,
      model,
      year,
      part,
    });
    res.json(products);
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getProductsWithSubPartsByVehicle = async (
  req: Request,
  res: Response
) => {
  const { make, model, year, part } = req.query;
  try {
    const products = await productService.getProductsWithSubPartsByVehicle({
      make,
      model,
      year,
      part,
    });
    res.json(products);
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getGroupedProductWithSubParts = async (req: Request, res: Response) => {
  const { make, model, year, part } = req.query;
  try {
    const result = await productService.getGroupedProductWithSubParts({
      make,
      model,
      year,
      part,
    });
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getGroupedProductWithSubPartsV2 = async (
  req: Request,
  res: Response
) => {
  const { make, model, year, part } = req.query;
  try {
    const result = await productService.getGroupedProductWithSubPartsV2({
      make,
      model,
      year,
      part,
    });
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getYearsForMakeModel = async (req: Request, res: Response) => {
  try {
    const make = String(req.query.make);
    const model = String(req.query.model);
    const years = await prisma.product.findMany({
      where: {
        modelYear: {
          model: {
            name: model,
            make: { name: make },
          },
        },
      },
      select: {
        modelYear: {
          select: {
            year: { select: { value: true } },
          },
        },
      },
      distinct: ["modelYearId"],
    });
    const yearSet = new Set(
      years.map(
        (y: { modelYear: { year: { value: any } } }) => y.modelYear.year.value
      )
    );
    res.json([...yearSet]);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getAllProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page)) || 1;
    const limit = parseInt(String(req.query.limit)) || 50;

    // Extract filter parameters
    const filters = {
      make: req.query.make ? String(req.query.make) : undefined,
      model: req.query.model ? String(req.query.model) : undefined,
      year: req.query.year ? String(req.query.year) : undefined,
      part: req.query.part ? String(req.query.part) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    };

    const result = await productService.getAllProducts(page, limit, filters);
    res.json(result);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
};

// Create variant for a product
exports.createVariant = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(String(req.params.id));
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const payload = req.body || {};
    const result = await productService.createVariant(productId, payload);
    res.status(201).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

// Update existing variant
exports.updateVariant = async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(String(req.params.variantId));
    if (isNaN(variantId)) {
      return res.status(400).json({ error: "Invalid variant ID" });
    }
    const payload = req.body || {};
    const result = await productService.updateVariant(variantId, payload);
    res.status(200).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

// Delete existing variant
exports.deleteVariant = async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(String(req.params.variantId));
    if (isNaN(variantId)) {
      return res.status(400).json({ error: "Invalid variant ID" });
    }
    const result = await productService.deleteVariant(variantId);
    res.status(200).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
};
