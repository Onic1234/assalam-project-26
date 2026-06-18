const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  console.log('Worksheets:', workbook.worksheets.map(w => w.name));
  
  for (const sheet of workbook.worksheets) {
    console.log(`\nWorksheet: ${sheet.name}`);
    console.log(`Max row: ${sheet.rowCount}, Max col: ${sheet.columnCount}`);
    
    // Print row 1-3 to see headers
    for (let i = 1; i <= Math.min(sheet.rowCount, 4); i++) {
      const row = sheet.getRow(i);
      const values = [];
      for (let j = 1; j <= sheet.columnCount; j++) {
        values.push(row.getCell(j).value);
      }
      console.log(`  Row ${i}:`, JSON.stringify(values.slice(0, 15)));
    }
  }
}

run().catch(console.error);
