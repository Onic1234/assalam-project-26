const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('A0PS ASET MANAGEMENT');
  
  let totalAssets = 0;
  const categories = {};
  const locations = {};
  const monthlySchedules = {
    Januari: 0, Februari: 0, Maret: 0, April: 0, Mei: 0, Juni: 0,
    Juli: 0, Agustus: 0, September: 0, Oktober: 0, November: 0, Desember: 0
  };
  
  // Column mappings based on headers
  // January: cols 23-26
  // February: cols 27-31
  // March: cols 32-35
  // April: cols 36-39
  // May: cols 40-43
  // June: cols 44-47
  // July: cols 48-51
  // August: cols 52-55
  // September: cols 56-59
  // October: cols 60-63
  // November: cols 64-67
  // December: cols 68-71
  
  const monthCols = {
    Januari: [23, 24, 25, 26],
    Februari: [27, 28, 29, 30, 31],
    Maret: [32, 33, 34, 35],
    April: [36, 37, 38, 39],
    Mei: [40, 41, 42, 43],
    Juni: [44, 45, 46, 47],
    Juli: [48, 49, 50, 51],
    Agustus: [52, 53, 54, 55],
    September: [56, 57, 58, 59],
    Oktober: [60, 61, 62, 63],
    November: [64, 65, 66, 67],
    Desember: [68, 69, 70, 71]
  };

  const parsedAssets = [];

  for (let i = 4; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const kode = row.getCell(1).value;
    const rawNama = row.getCell(2).value;
    
    if (!kode && !rawNama) continue; // skip empty rows
    
    totalAssets++;
    
    // Parse Nama Aset from multiline string
    let namaAset = rawNama || '';
    if (typeof rawNama === 'string' && rawNama.includes('Nama :')) {
      const match = rawNama.match(/Nama\s*:\s*([^\n]+)/i);
      if (match) {
        namaAset = match[1].trim();
      }
    } else if (typeof rawNama === 'string') {
      namaAset = rawNama.split('\n')[0].replace(/Nama\s*:\s*/i, '').trim();
    }
    
    const kategori = (row.getCell(3).value || '').toString().trim();
    const lokasi = (row.getCell(4).value || '').toString().trim();
    const vendor = (row.getCell(7).value || '').toString().trim();
    const tahunPerolehan = row.getCell(8).value;
    const periodeMaintenance = (row.getCell(22).value || '').toString().trim();
    
    // Track categories
    categories[kategori] = (categories[kategori] || 0) + 1;
    // Track locations
    locations[lokasi] = (locations[lokasi] || 0) + 1;
    
    // Check maintenance schedule
    const scheduledMonths = [];
    let hasMaintenanceThisMonth = false;
    
    for (const [monthName, cols] of Object.entries(monthCols)) {
      let monthScheduled = false;
      for (const col of cols) {
        const val = row.getCell(col).value;
        if (val !== null && val !== undefined && val !== '') {
          monthScheduled = true;
          break;
        }
      }
      if (monthScheduled) {
        monthlySchedules[monthName]++;
        scheduledMonths.push(monthName);
      }
    }
    
    parsedAssets.push({
      id: totalAssets,
      kode,
      namaAset,
      kategori,
      lokasi,
      vendor,
      tahunPerolehan,
      periodeMaintenance,
      scheduledMonths
    });
  }
  
  console.log(`Total Assets Counted: ${totalAssets}`);
  console.log('\nCategories:', categories);
  console.log('\nLocations (Top 10):', Object.entries(locations).sort((a,b) => b[1] - a[1]).slice(0, 10));
  console.log('\nMonthly Schedules:', monthlySchedules);
  
  // Let's print the first 5 parsed assets
  console.log('\nFirst 5 parsed assets:');
  console.log(JSON.stringify(parsedAssets.slice(0, 5), null, 2));
}

run().catch(console.error);
