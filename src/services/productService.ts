const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

type VehicleQuery = { make: string; model: string; year: string; part: string };

exports.getProductsByVehicle = async ({ make, model, year, part }: VehicleQuery) => {
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

exports.getProductsWithSubPartsByVehicle = async ({ make, model, year, part }: VehicleQuery) => {
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

exports.getGroupedProductWithSubParts = async ({ make, model, year, part } : VehicleQuery) => {
  const products = await prisma.product.findMany({
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
