const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('A0PS ASET MANAGEMENT');
  
  for (let i = 1; i <= 5; i++) {
    const row = sheet.getRow(i);
    const cells = [];
    for (let j = 1; j <= sheet.columnCount; j++) {
      cells.push({ col: j, val: row.getCell(j).value });
    }
    console.log(`\nRow ${i}:`);
    console.log(cells.filter(c => c.val !== null).map(c => `${c.col}:${JSON.stringify(c.val)}`).join(' | '));
  }
}

run().catch(console.error);
