const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function inspectExcel(filePath) {
  console.log(`\n================ Inspecting ${path.basename(filePath)} ================`);
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${filePath}`);
    return;
  }
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
    console.log('Sheets:', workbook.worksheets.map(w => w.name));
    for (const sheet of workbook.worksheets) {
      console.log(`\nSheet: ${sheet.name}`);
      console.log(`Rows count: ${sheet.rowCount}`);
      
      // Print first 5 rows
      const rows = [];
      let printed = 0;
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (printed < 5) {
          const vals = Array.isArray(row.values) ? row.values.slice(1) : row.values;
          rows.push({ rowNumber, values: vals });
          printed++;
        }
      });
      console.log('First few rows:');
      rows.forEach(r => {
        console.log(`  Row ${r.rowNumber}:`, JSON.stringify(r.values));
      });
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
}

async function run() {
  const rootDir = path.resolve(__dirname, '..');
  const files = [
    path.join(rootDir, 'Daftar member 2026.xlsx'),
    path.join(rootDir, 'NOMINASI ALL 2526 - kirim renang.xlsx')
  ];
  for (const file of files) {
    await inspectExcel(file);
  }
}

run();
