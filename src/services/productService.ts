// import { prisma } from './prisma';

import { prisma } from './prisma';

type VehicleQuery = { make: string; model: string; year: string; part: string };

export const getProductsByVehicle = async ({ make, model, year, part }: VehicleQuery) => {
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

export const getProductsWithSubPartsByVehicle = async ({ make, model, year, part }: VehicleQuery) => {
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

export const getGroupedProductWithSubParts = async ({ make, model, year, part } : VehicleQuery) => {
  const products = await prisma.product.findMany({
    where: {
      modelYear: {
        model: { name: model, make: { name: make } },
        year: { value: year }
      },
      partType: { name: part }
    },
    include: { 
      subParts: true,
      variants: true, // <-- include all variants for each product
      images: true,
      modelYear: {
        include: {
          model: { include: { make: true } },
          year: true
        }
      },
      partType: true
     }
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


  // Flatten all variants into a single array for easy frontend consumption
  const allVariants = [];
  for (const p of products) {
    for (const v of p.variants) {
      allVariants.push({
        ...v,
        product: {
          id: p.id,
          sku: p.sku,
          modelYear: p.modelYear,
          partType: p.partType,
          images: p.images,
          subParts: p.subParts,
          description: p.description,
          status: p.status,
          Availability: p.Availability,
          warranty: p.warranty,
          categoryId: p.categoryId,
        }
      });
    }
  }


  // Return a single object
  return {
    make,
    model,
    year,
    part,
    subParts: allSubParts,
    variants: allVariants
  };
};
