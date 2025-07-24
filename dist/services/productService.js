"use strict";
// import { prisma } from './prisma';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupedProductWithSubParts = exports.getProductsWithSubPartsByVehicle = exports.getProductsByVehicle = void 0;
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
                year: { value: year }
            },
            partType: { name: part }
        },
        include: { subParts: true }
    });
    // Aggregate all unique subParts
    const allSubParts = [];
    const seen = new Set();
    for (const p of products) {
        for (const sp of p.subParts) {
            if (!seen.has(sp.id)) {
                allSubParts.push(sp);
                seen.add(sp.id);
            }
        }
    }
    // Return a single object
    return {
        make,
        model,
        year,
        part,
        subParts: allSubParts
    };
};
exports.getGroupedProductWithSubParts = getGroupedProductWithSubParts;
