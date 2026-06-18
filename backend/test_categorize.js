const ExcelJS = require('exceljs');
const path = require('path');

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
  
  // Location-based defaults if name doesn't match
  if (l.includes('pompa') || l.includes('chemical')) {
    return 'Utility';
  }
  if (l.includes('toilet') || l.includes('locker') || l.includes('lobby') || l.includes('café') || l.includes('kantor')) {
    return 'Furniture';
  }
  
  return 'Utility'; // Default fallback
}

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AOPS Manajemen Aset & Inventory -April (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('A0PS ASET MANAGEMENT');
  
  const catCounts = { Utility: 0, Furniture: 0, Mekanikal: 0, Elektronik: 0, Mesin: 0 };
  
  for (let i = 4; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const kode = row.getCell(1).value;
    const rawNama = row.getCell(2).value;
    let kategori = (row.getCell(3).value || '').toString().trim();
    const lokasi = (row.getCell(4).value || '').toString().trim();
    
    if (!kode && !rawNama) continue;
    
    let namaAset = rawNama || '';
    if (typeof rawNama === 'string' && rawNama.includes('Nama :')) {
      const match = rawNama.match(/Nama\s*:\s*([^\n]+)/i);
      if (match) namaAset = match[1].trim();
    } else if (typeof rawNama === 'string') {
      namaAset = rawNama.split('\n')[0].replace(/Nama\s*:\s*/i, '').trim();
    }
    
    const wasEmpty = !kategori;
    if (wasEmpty) {
      kategori = classify(namaAset, lokasi);
    }
    
    // Normalize category name to match requested ones
    if (kategori === 'Peralatan Kantor') kategori = 'Furniture'; // merge Peralatan Kantor into Furniture or keep it?
    
    catCounts[kategori] = (catCounts[kategori] || 0) + 1;
    
    if (wasEmpty && i <= 50) {
      console.log(`Row ${i}: Name="${namaAset}" | Location="${lokasi}" -> Classified as "${kategori}"`);
    }
  }
  
  console.log('\nFinal Category Counts with Classifier:', catCounts);
}

run().catch(console.error);
