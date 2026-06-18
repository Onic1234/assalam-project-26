const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  console.log('Sheet Names:', workbook.worksheets.map(w => w.name));
  
  for (const sheet of workbook.worksheets) {
    console.log(`\n================ Sheet: ${sheet.name} ================`);
    console.log(`Rows: ${sheet.rowCount}, Cols: ${sheet.columnCount}`);
    
    // Print row 1-10
    const limit = Math.min(sheet.rowCount, 15);
    for (let i = 1; i <= limit; i++) {
      const row = sheet.getRow(i);
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        vals[colNumber] = cell.value;
      });
      // Remove leading nulls for cleaner display
      console.log(`Row ${i}:`, JSON.stringify(vals.slice(0, 15)));
    }
  }
}

run().catch(console.error);
