import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup...');

  // Deleting tables in the correct order to avoid foreign key constraint errors.
  // We delete records that have dependencies on other tables first.

  // 1. Products are dependent on other tables and are part of the m-n relation.
  // Deleting them will also remove entries from the implicit `_ProductSubParts` join table.
  await prisma.product.deleteMany({});
  console.log('Deleted all products.');

  // 2. SubParts can now be safely deleted as they are no longer referenced by Products.
  await prisma.subPart.deleteMany({});
  console.log('Deleted all subParts.');

  // 3. Delete the rest of the master data.
  await prisma.modelYear.deleteMany({});
  console.log('Deleted all ModelYears.');
  
  await prisma.year.deleteMany({});
  console.log('Deleted all Years.');

  await prisma.model.deleteMany({});
  console.log('Deleted all Models.');

  await prisma.make.deleteMany({});
  console.log('Deleted all Makes.');

  await prisma.partType.deleteMany({});
  console.log('Deleted all PartTypes.');

  console.log('Cleanup complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 