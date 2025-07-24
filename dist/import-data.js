"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const prisma = new client_1.PrismaClient();
async function main() {
    const wb = XLSX.readFile('transmission.xlsx');
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
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
