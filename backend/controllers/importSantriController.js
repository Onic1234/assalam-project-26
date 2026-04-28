// controllers/importSantriController.js
const ExcelJS = require("exceljs");
const { Santri } = require("../models");
const Boom = require("@hapi/boom");

const importSantri = async (request, h) => {
  try {
    const fileBuffer = request.payload.file;
    if (!fileBuffer) {
      return Boom.badRequest("File Excel harus diupload");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    const worksheet = workbook.worksheets[0];

    const dataFromExcel = [];
    const headers = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(cell.value);
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          if (headers[colNumber - 1]) {
            rowData[headers[colNumber - 1]] = cell.value;
          }
        });
        if (Object.keys(rowData).length > 0) {
          dataFromExcel.push({ rowNumber, data: rowData });
        }
      }
    });

    if (dataFromExcel.length === 0) {
      return Boom.badRequest("File Excel kosong atau tidak memiliki data");
    }

    // 1. Kumpulkan semua ID Santri dari file Excel dan pastikan semuanya adalah string
    const idsFromExcel = dataFromExcel
      .map((item) => {
        const id =
          item.data["ID Santri"] ||
          item.data["ID_SANTRI"] ||
          item.data["id_santri"];
        return id ? String(id).trim() : null; // Konversi ke string dan hapus spasi
      })
      .filter(Boolean);

    // 2. Ambil semua ID yang sudah ada di database
    const existingSantris = await Santri.findAll({
      where: { id_santri: idsFromExcel },
      attributes: ["id_santri"],
    });
    const existingIdsInDb = new Set(existingSantris.map((s) => s.id_santri));

    const newSantriToCreate = [];
    const failedImports = [];
    const duplicates = [];
    const processedIds = new Set(existingIdsInDb); // Gabungkan ID dari DB untuk cek duplikat di file

    // 3. Loop di memori untuk validasi dan memisahkan data
    for (const item of dataFromExcel) {
      const row = item.data;
      const idSantriValue =
        row["ID Santri"] || row["ID_SANTRI"] || row["id_santri"];

      const santriData = {
        no: row["NO"] || null,
        id_santri: idSantriValue ? String(idSantriValue).trim() : null,
        nama_santri:
          row["Nama Santri"] || row["NAMA_SANTRI"] || row["nama_santri"],
        jenis_kelamin:
          row["L/P"] || row["JENIS_KELAMIN"] || row["jenis_kelamin"],
        kelas: row["Kelas"] || row["KELAS"] || row["kelas"],
        unit: row["Unit"] || row["UNIT"] || row["unit"],
      };

      if (
        !santriData.id_santri ||
        !santriData.nama_santri ||
        !santriData.jenis_kelamin ||
        !santriData.kelas ||
        !santriData.unit
      ) {
        failedImports.push({
          row: item.rowNumber,
          data: santriData,
          error: "Data tidak lengkap",
        });
        continue;
      }

      if (!["L", "P"].includes(santriData.jenis_kelamin)) {
        failedImports.push({
          row: item.rowNumber,
          data: santriData,
          error: "Jenis kelamin harus L atau P",
        });
        continue;
      }

      // Cek duplikat (baik dari DB maupun dari baris sebelumnya di file yang sama)
      if (processedIds.has(santriData.id_santri)) {
        duplicates.push({
          row: item.rowNumber,
          data: santriData,
          error: "ID Santri duplikat",
        });
        continue;
      }

      newSantriToCreate.push(santriData);
      processedIds.add(santriData.id_santri);
    }

    let successImports = [];
    if (newSantriToCreate.length > 0) {
      successImports = await Santri.bulkCreate(newSantriToCreate, {
        returning: true,
      });
    }

    return h
      .response({
        success: true,
        message: "Import selesai",
        summary: {
          total_rows_in_file: dataFromExcel.length,
          success_count: successImports.length,
          failed_count: failedImports.length,
          duplicate_count: duplicates.length,
        },
        details: {
          successful_imports: successImports,
          failed_imports: failedImports,
          duplicates: duplicates,
        },
      })
      .code(200);
  } catch (error) {
    console.error("Error importing santri:", error);
    // Jika masih ada error (misalnya koneksi DB), tangani di sini
    return Boom.internal("Terjadi kesalahan pada server saat mengimport data");
  }
};

const downloadTemplate = async (request, h) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Data Santri");

    worksheet.columns = [
      { header: "NO", key: "no", width: 5 },
      { header: "ID Santri", key: "id_santri", width: 15 },
      { header: "Nama Santri", key: "nama_santri", width: 30 },
      { header: "L/P", key: "jenis_kelamin", width: 5 },
      { header: "Kelas", key: "kelas", width: 10 },
      { header: "Unit", key: "unit", width: 10 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.addRow({
      no: 1,
      id_santri: "2425573",
      nama_santri: "ACHMAD ALTHIEGO ZIDNY KAMAL",
      jenis_kelamin: "L",
      kelas: "X",
      unit: "SMA",
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return h
      .response(buffer)
      .header(
        "Content-Disposition",
        "attachment; filename=template_data_santri.xlsx"
      )
      .type(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
  } catch (error) {
    console.error("Error generating template:", error);
    return Boom.internal("Terjadi kesalahan saat membuat template");
  }
};

const getAllSantri = async (request, h) => {
  try {
    const santris = await Santri.findAll({
      order: [["createdAt", "DESC"]],
    });

    return h
      .response({
        success: true,
        data: santris,
        count: santris.length,
      })
      .code(200);
  } catch (error) {
    console.error("Error getting santri data:", error);
    return Boom.internal("Terjadi kesalahan saat mengambil data santri");
  }
};

module.exports = {
  importSantri,
  downloadTemplate,
  getAllSantri,
};
