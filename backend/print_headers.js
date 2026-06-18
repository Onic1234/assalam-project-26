const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('A0PS ASET MANAGEMENT');
  console.log('Worksheet:', sheet.name);
  console.log('Max row:', sheet.rowCount, 'Max col:', sheet.columnCount);
  
  const row3 = sheet.getRow(3);
  const headers = [];
  for (let j = 1; j <= sheet.columnCount; j++) {
    headers.push({ col: j, value: row3.getCell(j).value });
  }
  console.log('Row 3 Headers:', headers.filter(h => h.value !== null));
  
  // Let's also check if there's any other row with headers, e.g., row 2 or 1
  const row2 = sheet.getRow(2);
  const headers2 = [];
  for (let j = 1; j <= sheet.columnCount; j++) {
    headers2.push({ col: j, value: row2.getCell(j).value });
  }
  console.log('Row 2 Headers:', headers2.filter(h => h.value !== null));

  const row1 = sheet.getRow(1);
  const headers1 = [];
  for (let j = 1; j <= sheet.columnCount; j++) {
    headers1.push({ col: j, value: row1.getCell(j).value });
  }
  console.log('Row 1 Headers:', headers1.filter(h => h.value !== null));
}

run().catch(console.error);
