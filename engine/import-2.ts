import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { readdirSync } from 'fs';
import { join, extname } from 'path';

const prisma = new PrismaClient();

// 1️⃣ HEADER-TO-COLUMN mapping
const headerMap: Record<string, string> = {
  make:             'Make Name' , // also "9" ,   
  model:            'Model Name',
  year:             'Model Year',
  partType:         'Part Name',
  subPart:          'Sub Part Name', // sub Part Name
  inStock:          'Stock',
  miles:            'Miles',
  actualPrice:      'Actual Price 1',
  discountedPrice:  'Discount Price 1',
  // sku is generated, so no mapping needed
};

async function importWorkbook(buffer: Buffer | ArrayBuffer) {
  const wb = XLSX.read(buffer, { type: buffer instanceof Buffer ? 'buffer' : 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  for (const raw of rawRows) {
    // 2️⃣ Remap + trim every field according to headerMap
    const row: Record<string, any> = {};
    for (const [field, colName] of Object.entries(headerMap)) {
      const val = raw[colName];
      // trim strings, leave other types as is
      row[field] = typeof val === 'string' ? val.trim() : val;
    }

    // ── your entire upsert block BELOW stays exactly the same ──

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
        inStock: row.inStock === 'Yes' || row.inStock === 'YES' || row.inStock === 'Part Available',
        actualprice: Number(row.actualPrice),
        discountedPrice: Number(row.discountedPrice),
        miles: row.miles ? String(row.miles) : null,
        subParts: {
          connect: subParts.map(sp => ({ id: sp.id })),
        },
      },
      update: {
        inStock: row.inStock === 'Yes' || row.inStock === 'YES' || row.inStock === "Part Available",
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
}

async function main() {
  // — Option A: batch all XLSX in ./data/
  const dataDir = join(__dirname, '..','data');
  const files = readdirSync(dataDir).filter(f => extname(f).toLowerCase() === '.xlsx');
  for (const f of files) {
    const buf = await import('fs/promises').then(m => m.readFile(join(dataDir, f)));
    await importWorkbook(buf);
  }

  // — Option B: fetch from a list of URLs
  /*
  const urls = [
    'https://…/transmission.xlsx',
    'https://…/engine.xlsx',
    // …etc
  ];
  for (const url of urls) {
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    await importWorkbook(res.data);
  }
  */

  console.log('All imports complete');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
