import { error } from "console";
import { Request , Response} from "express"

const productService = require('../services/productService');

exports.getProductsByVehicle = async (req : Request , res : Response) => {
  const { make, model, year, part } = req.query;
  try {
    const products = await productService.getProductsByVehicle({ make, model, year, part });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};