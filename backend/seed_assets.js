// seed_assets.js
const ExcelJS = require('exceljs');
const path = require('path');
const { Asset } = require('./models');

function classify(nama, lokasi) {
  const n = nama.toLowerCase();
  const l = lokasi.toLowerCase();
  
  if (n.includes('pompa') || n.includes('filter') || n.includes('vacuum') || n.includes('chlorinator') || n.includes('heater') || n.includes('panel listrik')) {
    return 'Utility';
  }
  if (n.includes('kursi') || n.includes('meja') || n.includes('lemari') || n.includes('rak') || n.includes('sofa') || n.includes('cermin') || n.includes('gordyn') || n.includes('bantal') || n.includes('display') || n.includes('tempat parkir') || n.includes('bench') || n.includes('hanger')) {
    return 'Furniture';
  }
  if (n.includes('ac') || n.includes('exhaust') || n.includes('blower') || n.includes('fan') || n.includes('kipas') || n.includes('fitting') || n.includes('instalasi') || n.includes('pipa') || n.includes('lampu kolam')) {
    return 'Mekanikal';
  }
  if (n.includes('printer') || n.includes('tablet') || n.includes('holder') || n.includes('cctv') || n.includes('tv') || n.includes('sound') || n.includes('speaker') || n.includes('barcode') || n.includes('fingerprint') || n.includes('komputer') || n.includes('pc') || n.includes('laptop') || n.includes('telepon') || n.includes('modem')) {
    return 'Elektronik';
  }
  if (n.includes('genset') || n.includes('mesin potong') || n.includes('kompresor') || n.includes('dispenser') || n.includes('kulkas') || n.includes('freezer') || n.includes('chiller') || n.includes('blender') || n.includes('showcase') || n.includes('grinder') || n.includes('mesin kopi') || n.includes('ice maker') || n.includes('microwave')) {
    return 'Mesin';
  }
  
  // Location defaults
  if (l.includes('pompa') || l.includes('chemical')) {
    return 'Utility';
  }
  if (l.includes('toilet') || l.includes('locker') || l.includes('lobby') || l.includes('café') || l.includes('kantor')) {
    return 'Furniture';
  }
  
  return 'Utility'; // Default fallback
}

async function run() {
  console.log('🔄 Starting Asset database seeding...');
  
  // 1. Sync the model (drops and creates the 'assets' table)
  await Asset.sync({ force: true });
  console.log('✅ assets table synced successfully.');
  
  // 2. Load Excel File
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('A0PS ASET MANAGEMENT');
  
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

  const assetsToInsert = [];

  for (let i = 4; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const kode = row.getCell(1).value;
    const rawNama = row.getCell(2).value;
    
    if (!kode && !rawNama) continue;
    
    // Parse Nama Aset from multiline
    let namaAset = rawNama || '';
    if (typeof rawNama === 'string' && rawNama.includes('Nama :')) {
      const match = rawNama.match(/Nama\s*:\s*([^\n]+)/i);
      if (match) {
        namaAset = match[1].trim();
      }
    } else if (typeof rawNama === 'string') {
      namaAset = rawNama.split('\n')[0].replace(/Nama\s*:\s*/i, '').trim();
    }
    
    let kategori = (row.getCell(3).value || '').toString().trim();
    const lokasi = (row.getCell(4).value || '').toString().trim();
    const coa = (row.getCell(5).value || '').toString().trim();
    const merkType = (row.getCell(6).value || '').toString().trim();
    const vendor = (row.getCell(7).value || '').toString().trim();
    
    // Parse Acquisition Year
    let tahunPerolehan = row.getCell(8).value;
    if (tahunPerolehan && typeof tahunPerolehan === 'object') {
      // Handle Excel formula results
      tahunPerolehan = tahunPerolehan.result;
    }
    tahunPerolehan = tahunPerolehan ? parseInt(tahunPerolehan) : null;
    
    // Parse Acquisition Cost (Harga Perolehan)
    let hargaPerolehan = row.getCell(9).value;
    if (hargaPerolehan && typeof hargaPerolehan === 'object') {
      hargaPerolehan = hargaPerolehan.result;
    }
    hargaPerolehan = hargaPerolehan ? parseFloat(hargaPerolehan) : null;
    
    // Parse Umur Aktiva
    let umurAktiva = row.getCell(10).value;
    if (umurAktiva && typeof umurAktiva === 'object') {
      umurAktiva = umurAktiva.result;
    }
    umurAktiva = umurAktiva ? parseInt(umurAktiva) : null;
    
    const periodeMaintenance = (row.getCell(22).value || '').toString().trim();
    
    // Auto classify empty categories
    if (!kategori) {
      kategori = classify(namaAset, lokasi);
    }
    // Map Peralatan Kantor to Furniture
    if (kategori === 'Peralatan Kantor') {
      kategori = 'Furniture';
    }
    
    // Parse schedules
    const scheduledMonths = [];
    const scheduleDetails = {};
    let hasMaintenanceThisMonth = false; // "This month" is April 2026 based on the spreadsheet header "Per April 2026"
    
    for (const [monthName, cols] of Object.entries(monthCols)) {
      const weeks = [];
      let isScheduledForMonth = false;
      
      for (const col of cols) {
        let val = row.getCell(col).value;
        if (val && typeof val === 'object') {
          val = val.result;
        }
        if (val !== null && val !== undefined && val !== '') {
          weeks.push(1);
          isScheduledForMonth = true;
        } else {
          weeks.push(0);
        }
      }
      
      scheduleDetails[monthName] = weeks;
      
      if (isScheduledForMonth) {
        scheduledMonths.push(monthName);
        if (monthName === 'April') {
          hasMaintenanceThisMonth = true;
        }
      }
    }
    
    // Set Maintenance Status
    let statusMaintenance = 'No Maintenance';
    if (scheduledMonths.length > 0) {
      if (hasMaintenanceThisMonth) {
        statusMaintenance = 'Pending'; // Needs maintenance this month (April)
      } else {
        statusMaintenance = 'Scheduled'; // Scheduled for other months
      }
    }
    
    assetsToInsert.push({
      kode: kode ? kode.toString().trim() : '',
      nama: namaAset,
      kategori,
      lokasi,
      coa: coa || null,
      merk_type: merkType || null,
      vendor: vendor || null,
      tahun_perolehan: tahunPerolehan,
      harga_perolehan: hargaPerolehan,
      umur_aktiva: umurAktiva,
      periode_maintenance: periodeMaintenance || null,
      scheduled_months: scheduledMonths,
      schedule_details: scheduleDetails,
      status_maintenance: statusMaintenance
    });
  }
  
  // Bulk insert into MySQL
  await Asset.bulkCreate(assetsToInsert);
  console.log(`✅ Seeding complete. Inserted ${assetsToInsert.length} assets.`);
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  });
