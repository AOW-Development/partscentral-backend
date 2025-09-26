// generate_excel.js
// Creates parts.xlsx from the table you provided.
// Requires: npm install exceljs

const ExcelJS = require('exceljs');

const rows = [
  { miles: '88000', sku: 'ACURA-RSX-2003-ENGINE-(2.0L),VIN6(8THDIGIT),MT-88000', actualPrice: '1295', discountedPrice: 'NULL' },
  { miles: 'Yes', sku: 'BMW-X6M-2016-ENGINE-(4.4L,TWINTURBO),DELPHIMANUFACTUREDIGNITIONCOILS-YES', actualPrice: '18250', discountedPrice: '17700' },
  { miles: 'Yes', sku: 'BMW-X6M-2017-ENGINE-(4.4L,TWINTURBO)-YES', actualPrice: '18250', discountedPrice: '17700' },
  { miles: 'Yes', sku: 'BMW-X6M-2018-ENGINE-(4.4L,TWINTURBO)-YES', actualPrice: '18250', discountedPrice: '17700' },
  { miles: 'Yes', sku: 'BMW-X6M-2019-ENGINE-(4.4L,TWINTURBO)-YES', actualPrice: '18250', discountedPrice: '17700' },
  { miles: '30k', sku: 'CHEVY-SUBURBAN-3500-2018-ENGINE-(6.0L,VING,8THDIGIT,OPTL96)-30K', actualPrice: 'NULL', discountedPrice: '3910' },
  { miles: '109000', sku: 'ACURA-MDX-2004-TRANSMISSION-AT,(3.5L)-109000', actualPrice: 'NULL', discountedPrice: '1783' },
  { miles: '108000', sku: 'ACURA-MDX-2005-TRANSMISSION-AT,(3.5L)-108000', actualPrice: 'NULL', discountedPrice: '1783' },
  { miles: '107000', sku: 'ACURA-MDX-2006-TRANSMISSION-AT,(3.5L)-107000', actualPrice: 'NULL', discountedPrice: '1783' },
  { miles: 'NULL', sku: 'BMW-435I-2015-TRANSMISSION-AT,AWD,W/OSPORTTRANSMISSION-N/A', actualPrice: '0', discountedPrice: '0' },
  { miles: 'NULL', sku: 'DODGE-CHALLENGER(CHRYSLER)-2018-TRANSMISSION-MT,(6SPEED),6.2L-N/A', actualPrice: '0', discountedPrice: '0' },
  { miles: 'NULL', sku: 'DODGE-CHALLENGER(CHRYSLER)-2019-TRANSMISSION-MT,(6SPEED),6.2L-N/A', actualPrice: '0', discountedPrice: '0' },
  { miles: '$137K', sku: 'ISUZU-RODEO-1999-TRANSMISSION-MT,2.2L(4CYLINDER)-$137K', actualPrice: '980', discountedPrice: '900' },
  { miles: '20k', sku: 'TOYOTA-TUNDRA-2021-TRANSMISSION-(AT),4X4-20K', actualPrice: '0', discountedPrice: '0' }
];

function toNullIfEmptyOrNA(v){
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || s.toUpperCase() === 'NULL' || s.toUpperCase() === 'N/A') return null;
  return s;
}

// If the value looks like an integer (only digits), return Number; otherwise return original string
function parseNumericIfIntegerString(v){
  const s = toNullIfEmptyOrNA(v);
  if (s === null) return null;
  // allow optional commas: "1,234" -> 1234
  const justDigits = s.replace(/,/g, '');
  if (/^-?\d+$/.test(justDigits)) {
    return Number(justDigits);
  }
  return s; // keep as string (e.g., '30k', '$137K', 'Yes')
}

async function main(){
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('parts');

  // Header
  ws.columns = [
    { header: 'miles', key: 'miles', width: 18 },
    { header: 'sku', key: 'sku', width: 90 },
    { header: 'actualPrice', key: 'actualPrice', width: 16 },
    { header: 'discountedPrice', key: 'discountedPrice', width: 16 }
  ];

  // Style header
  ws.getRow(1).font = { bold: true };

  // Add rows
  for (const r of rows) {
    const miles = toNullIfEmptyOrNA(r.miles);
    const sku = toNullIfEmptyOrNA(r.sku);
    const actualPrice = parseNumericIfIntegerString(r.actualPrice);
    const discountedPrice = parseNumericIfIntegerString(r.discountedPrice);

    // push preserves types: numbers, strings, or null -> blank cell
    ws.addRow([miles, sku, actualPrice, discountedPrice]);
  }

  // Format numeric columns if numeric - set numFmt for cells that are numbers
  // We'll scan through rows and ensure numeric numbers are shown without decimals
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const actualCell = row.getCell('actualPrice');
    const discCell = row.getCell('discountedPrice');
    if (typeof actualCell.value === 'number') actualCell.numFmt = '0';
    if (typeof discCell.value === 'number') discCell.numFmt = '0';
  });

  const outPath = './parts.xlsx';
  await wb.xlsx.writeFile(outPath);
  console.log('Saved', outPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
