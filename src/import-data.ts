import { PrismaClient } from '@prisma/client';
import { stringify } from 'node:querystring';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  const wb = XLSX.readFile('transmission.xlsx');
  const rows = XLSX.utils.sheet_to_json<{
    make: string;
    model: string;
    year: string;
    partType: string;
    subPart: string; // comma-separated or single
    sku: string;
    inStock: string | number | boolean;
    actualPrice: string | number;
    discountedPrice: string | number;
    miles: string | number;
  }>(wb.Sheets[wb.SheetNames[0]]);

  for (const row of rows) {
    // 1. Upsert Make
    const make = await prisma.make.upsert({
      where: { name: row.make },
      create: { name: row.make },
      update: {},
    });

    // 2. Upsert Model
    const model = await prisma.model.upsert({
      where: { name_makeId: { name: String(row.model), makeId: make.id } },
      create: { name: String(row.model), makeId: make.id },
      update: {},
    });

    // 3. Upsert Year
    const year = await prisma.year.upsert({
      where: { value: String(row.year) },
      create: { value: String(row.year) },
      update: {},
    });

    // 4. Upsert ModelYear
    const modelYear = await prisma.modelYear.upsert({
      where: { modelId_yearId: { modelId: model.id, yearId: year.id } },
      create: { modelId: model.id, yearId: year.id },
      update: {},
    });

    // 5. Upsert PartType
    const partType = await prisma.partType.upsert({
      where: { name: row.partType },
      create: { name: row.partType },
      update: {},
    });

    // 6. Upsert SubParts (do NOT split by comma, use full string)
    const subPartName = row.subPart.trim();
    const subPart = await prisma.subPart.upsert({
      where: { name_partTypeId: { name: subPartName, partTypeId: partType.id } },
      create: { name: subPartName, partTypeId: partType.id },
      update: {},
    });
    const subParts = [subPart];

    const generatedSku = [
      String(row.make),
      String(row.model),
      String(row.year),
      String(row.partType),
      String(row.subPart)
    ].join('-').replace(/\s+/g, '').toUpperCase();

    // 7. Create Product
    const product = await prisma.product.upsert({
      where: { sku: generatedSku },
      create: {
        sku: generatedSku,
        modelYear: { connect: { id: modelYear.id } },
        partType: { connect: { id: partType.id } },
        inStock: row.inStock === 'Yes',
        actualprice: Number(row.actualPrice),
        discountedPrice: Number(row.discountedPrice),
        miles: row.miles ? String(row.miles) : null,
        subParts: {
          connect: subParts.map(sp => ({ id: sp.id })),
        },
      },
      update: {
        inStock: row.inStock === 'Yes',
        actualprice: Number(row.actualPrice),
        discountedPrice: Number(row.discountedPrice),
        miles: row.miles ? String(row.miles) : null,
        subParts: {
          set: subParts.map(sp => ({ id: sp.id })),
        },
        modelYear: { connect: { id: modelYear.id } },
        partType: { connect: { id: partType.id } },
      },
    });
  }

  console.log('Import complete');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());