const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('A0PS ASET MANAGEMENT');
  
  let emptyCatCount = 0;
  console.log('Sample rows with empty Category:');
  for (let i = 4; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const kode = row.getCell(1).value;
    const rawNama = row.getCell(2).value;
    const kategori = row.getCell(3).value;
    
    if (!kode && !rawNama) continue;
    
    if (kategori === null || kategori === undefined || kategori.toString().trim() === '') {
      emptyCatCount++;
      if (emptyCatCount <= 10) {
        console.log(`Row ${i}: Kode=${kode}, Nama=${rawNama ? rawNama.toString().replace(/\n/g, ' ') : ''}, Lokasi=${row.getCell(4).value}, PeriodeMaint=${row.getCell(22).value}`);
      }
    }
  }
  console.log(`Total empty category rows: ${emptyCatCount}`);
}

run().catch(console.error);
