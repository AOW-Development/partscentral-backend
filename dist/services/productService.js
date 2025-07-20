"use strict";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
exports.getProductsByVehicle = async ({ make, model, year, part }) => {
    return prisma.product.findMany({
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
