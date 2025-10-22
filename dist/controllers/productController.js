"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const productService = require("../services/productService");
const prisma = new client_1.PrismaClient();
exports.getProductsByVehicle = async (req, res) => {
    const { make, model, year, part } = req.query;
    try {
        const products = await productService.getProductsByVehicle({
            make,
            model,
            year,
            part,
        });
        res.json(products);
    }
    catch (err) {
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.getProductsWithSubPartsByVehicle = async (req, res) => {
    const { make, model, year, part } = req.query;
    try {
        const products = await productService.getProductsWithSubPartsByVehicle({
            make,
            model,
            year,
            part,
        });
        res.json(products);
    }
    catch (err) {
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.getGroupedProductWithSubParts = async (req, res) => {
    const { make, model, year, part } = req.query;
    try {
        const result = await productService.getGroupedProductWithSubParts({
            make,
            model,
            year,
            part,
        });
        res.json(result);
    }
    catch (err) {
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.getGroupedProductWithSubPartsV2 = async (req, res) => {
    const { make, model, year, part } = req.query;
    try {
        const result = await productService.getGroupedProductWithSubPartsV2({
            make,
            model,
            year,
            part,
        });
        res.json(result);
    }
    catch (err) {
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.getYearsForMakeModel = async (req, res) => {
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
        const yearSet = new Set(years.map((y) => y.modelYear.year.value));
        res.json([...yearSet]);
    }
    catch (err) {
        console.error(err);
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.getAllProducts = async (req, res) => {
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
    }
    catch (err) {
        console.error(err);
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
    }
};
