"use strict";
// import { prisma } from './prisma';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProducts = exports.getGroupedProductWithSubPartsV2 = exports.getGroupedProductWithSubParts = exports.getProductsWithSubPartsByVehicle = exports.getProductsByVehicle = void 0;
const prisma_1 = require("./prisma");
const getProductsByVehicle = async ({ make, model, year, part, }) => {
    return prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: {
                    name: model,
                    make: { name: make },
                },
                year: { value: year },
            },
            partType: { name: part },
        },
        include: {
            images: true,
            inventory: true,
            // add more relations if needed
        },
    });
};
exports.getProductsByVehicle = getProductsByVehicle;
const getProductsWithSubPartsByVehicle = async ({ make, model, year, part, }) => {
    return prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: {
                    name: model,
                    make: { name: make },
                },
                year: { value: year },
            },
            partType: { name: part },
        },
        include: {
            images: true,
            inventory: true,
            subParts: true, // include subParts in the result
            modelYear: {
                include: {
                    model: {
                        include: {
                            make: true,
                        },
                    },
                    year: true,
                },
            },
            partType: true,
        },
    });
};
exports.getProductsWithSubPartsByVehicle = getProductsWithSubPartsByVehicle;
const getGroupedProductWithSubParts = async ({ make, model, year, part, }) => {
    const products = await prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: { name: model, make: { name: make } },
                year: { value: year },
            },
            partType: { name: part },
        },
        include: {
            subParts: true,
            variants: true, // <-- include all variants for each product
            images: true,
            modelYear: {
                include: {
                    model: { include: { make: true } },
                    year: true,
                },
            },
            partType: true,
        },
    });
    // 1. Aggregate all unique subParts
    const allSubParts = [];
    const seenSubParts = new Set();
    for (const p of products) {
        for (const sp of p.subParts) {
            if (!seenSubParts.has(sp.id)) {
                allSubParts.push(sp);
                seenSubParts.add(sp.id);
            }
        }
    }
    // 2. Create a map to group variants by sub-part
    const variantsBySubPart = new Map();
    for (const p of products) {
        for (const v of p.variants) {
            for (const sp of p.subParts) {
                if (!variantsBySubPart.has(sp.id)) {
                    variantsBySubPart.set(sp.id, {
                        subPart: sp,
                        variants: [],
                    });
                }
                variantsBySubPart.get(sp.id).variants.push({
                    ...v,
                    product: {
                        id: p.id,
                        sku: p.sku,
                        // other product details...
                        images: p.images,
                        description: p.description,
                    },
                });
            }
        }
    }
    // 3. Return the response
    return {
        make,
        model,
        year,
        part,
        subParts: allSubParts,
        groupedVariants: Array.from(variantsBySubPart.values()),
    };
};
exports.getGroupedProductWithSubParts = getGroupedProductWithSubParts;
const getGroupedProductWithSubPartsV2 = async ({ make, model, year, part, }) => {
    const products = await prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: { name: model, make: { name: make } },
                year: { value: year },
            },
            partType: { name: part },
        },
        include: {
            subParts: true,
            variants: true, // <-- include all variants for each product
            images: true,
            modelYear: {
                include: {
                    model: { include: { make: true } },
                    year: true,
                },
            },
            partType: true,
        },
    });
    // 1. Aggregate all unique subParts
    const allSubParts = [];
    const seenSubParts = new Set();
    for (const p of products) {
        for (const sp of p.subParts) {
            if (!seenSubParts.has(sp.id)) {
                allSubParts.push(sp);
                seenSubParts.add(sp.id);
            }
        }
    }
    // 2. Create a map to group variants by sub-part
    const variantsBySubPart = new Map();
    for (const p of products) {
        for (const v of p.variants) {
            for (const sp of p.subParts) {
                if (!variantsBySubPart.has(sp.id)) {
                    variantsBySubPart.set(sp.id, {
                        subPart: sp,
                        variants: [],
                    });
                }
                variantsBySubPart.get(sp.id).variants.push({
                    ...v,
                    product: {
                        id: p.id,
                        sku: p.sku,
                        // other product details...
                        images: p.images,
                        description: p.description,
                    },
                });
            }
        }
    }
    // 3. Return the response
    return {
        make,
        model,
        year,
        part,
        subParts: allSubParts,
        groupedVariants: Array.from(variantsBySubPart.values()),
    };
};
exports.getGroupedProductWithSubPartsV2 = getGroupedProductWithSubPartsV2;
const getAllProducts = async (page = 1, limit = 50, filters) => {
    const skip = (page - 1) * limit;
    // Build where clause based on filters
    const where = {};
    if (filters?.make && filters.make !== "Select Make") {
        where.modelYear = {
            ...where.modelYear,
            model: {
                ...where.modelYear?.model,
                make: { name: filters.make },
            },
        };
    }
    if (filters?.model && filters.model !== "Select Model") {
        where.modelYear = {
            ...where.modelYear,
            model: {
                ...where.modelYear?.model,
                name: filters.model,
            },
        };
    }
    if (filters?.year && filters.year !== "Select Year") {
        where.modelYear = {
            ...where.modelYear,
            year: { value: filters.year },
        };
    }
    if (filters?.part && filters.part !== "Select Part") {
        where.partType = { name: filters.part };
    }
    // Search across multiple fields
    if (filters?.search && filters.search.trim() !== "") {
        where.OR = [
            { sku: { contains: filters.search } },
            { description: { contains: filters.search } },
            { modelYear: { model: { name: { contains: filters.search } } } },
            {
                modelYear: { model: { make: { name: { contains: filters.search } } } },
            },
            { modelYear: { year: { value: { contains: filters.search } } } },
            { partType: { name: { contains: filters.search } } },
        ];
    }
    const [products, total] = await Promise.all([
        prisma_1.prisma.product.findMany({
            where,
            skip,
            take: limit,
            include: {
                modelYear: {
                    include: {
                        model: {
                            include: {
                                make: true,
                            },
                        },
                        year: true,
                    },
                },
                partType: true,
                subParts: true,
                variants: true,
                images: true,
            },
            orderBy: {
                id: "desc",
            },
        }),
        prisma_1.prisma.product.count({ where }),
    ]);
    return {
        products: products.map((p) => {
            // Build specification from variant specification or subparts
            let specification = "";
            if (p.variants.length > 0 && p.variants[0].specification) {
                specification = p.variants[0].specification;
            }
            else if (p.description) {
                specification = p.description;
            }
            else if (p.subParts.length > 0) {
                specification = p.subParts.map((sp) => sp.name).join(", ");
            }
            return {
                id: p.id,
                sku: p.sku,
                make: p.modelYear.model.make.name,
                model: p.modelYear.model.name,
                year: p.modelYear.year.value,
                part: p.partType.name,
                specification: specification,
                status: p.inStock ? "Instock" : "Outstock",
                amount: p.variants[0]?.actualprice || 0,
                images: p.images,
                subParts: p.subParts,
                variants: p.variants,
            };
        }),
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAllProducts = getAllProducts;
