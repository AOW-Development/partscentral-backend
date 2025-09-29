import { error } from "console";
import { Request , Response} from "express"
import { PrismaClient } from "@prisma/client";

const productService = require('../services/productService');
const prisma = new PrismaClient();

exports.getProductsByVehicle = async (req : Request , res : Response) => {
  const { make, model, year, part } = req.query;
  try {
    const products = await productService.getProductsByVehicle({ make, model, year, part });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getProductsWithSubPartsByVehicle = async (req : Request , res : Response) => {
  const { make, model, year, part } = req.query;
  try {
    const products = await productService.getProductsWithSubPartsByVehicle({ make, model, year, part });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getGroupedProductWithSubParts = async (req : Request, res : Response) => {
  const { make, model, year, part } = req.query;
  try {
    const result = await productService.getGroupedProductWithSubParts({ make, model, year, part });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getGroupedProductWithSubPartsV2 = async (req: Request, res: Response) => {
  const { make, model, year, part } = req.query;
  try {
    const result = await productService.getGroupedProductWithSubPartsV2({ make, model, year, part });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

exports.getYearsForMakeModel = async (req :Request, res:  Response) => {
  try {
    const make = String(req.query.make);
    const model = String(req.query.model);
    const years = await prisma.product.findMany({
      where: {
        modelYear: {
          model: {
            name: model,
            make: { name: make }
          }
        }
      },
      select: {
        modelYear: {
          select: {
            year: { select: { value: true } }
          }
        }
      },
      distinct: ['modelYearId']
    });
    const yearSet = new Set(years.map(y=> y.modelYear.year.value));
    res.json([...yearSet]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};