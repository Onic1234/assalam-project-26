const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('A0PS ASET MANAGEMENT');
  
  const col20Values = new Set();
  const col21Values = new Set();
  const col15Values = new Set();
  
  for (let i = 4; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const v20 = row.getCell(20).value;
    const v21 = row.getCell(21).value;
    const v15 = row.getCell(15).value;
    
    if (v20 !== null && v20 !== undefined) col20Values.add(v20.toString());
    if (v21 !== null && v21 !== undefined) col21Values.add(v21.toString());
    if (v15 !== null && v15 !== undefined) col15Values.add(v15.toString());
  }
  
  console.log('Distinct values for Col 15:', Array.from(col15Values));
  console.log('Distinct values for Col 20:', Array.from(col20Values));
  console.log('Distinct values for Col 21:', Array.from(col21Values));
}

run().catch(console.error);
