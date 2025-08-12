"use strict";
// import { prisma } from './prisma';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupedProductWithSubPartsV2 = exports.getGroupedProductWithSubParts = exports.getProductsWithSubPartsByVehicle = exports.getProductsByVehicle = void 0;
const prisma_1 = require("./prisma");
const getProductsByVehicle = async ({ make, model, year, part }) => {
    return prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: {
                    name: model,
                    make: { name: make }
                },
                year: { value: year }
            },
            partType: { name: part }
        },
        include: {
            images: true,
            inventory: true,
            // add more relations if needed
        }
    });
};
exports.getProductsByVehicle = getProductsByVehicle;
const getProductsWithSubPartsByVehicle = async ({ make, model, year, part }) => {
    return prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: {
                    name: model,
                    make: { name: make }
                },
                year: { value: year }
            },
            partType: { name: part }
        },
        include: {
            images: true,
            inventory: true,
            subParts: true, // include subParts in the result
            modelYear: {
                include: {
                    model: {
                        include: {
                            make: true
                        }
                    },
                    year: true
                }
            },
            partType: true
        }
    });
};
exports.getProductsWithSubPartsByVehicle = getProductsWithSubPartsByVehicle;
const getGroupedProductWithSubParts = async ({ make, model, year, part }) => {
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
const getGroupedProductWithSubPartsV2 = async ({ make, model, year, part }) => {
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
