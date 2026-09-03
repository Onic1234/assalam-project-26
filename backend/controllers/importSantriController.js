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
    const santriToUpdate = [];
    const failedImports = [];
    const duplicates = [];
    const processedInFile = new Set();

    // 3. Loop di memori untuk validasi dan memisahkan data (Create vs Update)
    for (const item of dataFromExcel) {
      const row = item.data;
      const idSantriValue =
        row["ID Santri"] || row["ID_SANTRI"] || row["id_santri"];

      const santriData = {
        no: row["NO"] || row["No"] || null,
        id_santri: idSantriValue ? String(idSantriValue).trim() : null,
        nama_santri:
          row["Nama Santri"] || row["NAMA_SANTRI"] || row["nama_santri"] || row["Nama"],
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
          error: "Data tidak lengkap (ID, Nama, L/P, Kelas, Unit wajib diisi)",
        });
        continue;
      }

      // Normalisasi jenis kelamin
      const jkUpper = String(santriData.jenis_kelamin).trim().toUpperCase();
      if (jkUpper.startsWith("L")) {
        santriData.jenis_kelamin = "L";
      } else if (jkUpper.startsWith("P")) {
        santriData.jenis_kelamin = "P";
      } else {
        failedImports.push({
          row: item.rowNumber,
          data: santriData,
          error: "Jenis kelamin harus L atau P",
        });
        continue;
      }

      // Cek duplikasi ID di dalam baris file Excel yang sama
      if (processedInFile.has(santriData.id_santri)) {
        duplicates.push({
          row: item.rowNumber,
          data: santriData,
          error: "ID Santri duplikat di dalam file Excel",
        });
        continue;
      }
      processedInFile.add(santriData.id_santri);

      // Pisahkan antara Santri Baru (Create) dan Santri Lama (Update Kelas/Unit/Nama)
      // FaceID dan Saldo santri lama TIDAK AKAN HILANG / TERHAPUS
      if (existingIdsInDb.has(santriData.id_santri)) {
        santriToUpdate.push(santriData);
      } else {
        newSantriToCreate.push(santriData);
      }
    }

    let successCreated = [];
    if (newSantriToCreate.length > 0) {
      successCreated = await Santri.bulkCreate(newSantriToCreate, {
        returning: true,
      });
    }

    let successUpdated = [];
    if (santriToUpdate.length > 0) {
      for (const data of santriToUpdate) {
        const updatePayload = {
          nama_santri: data.nama_santri,
          jenis_kelamin: data.jenis_kelamin,
          kelas: data.kelas,
          unit: data.unit,
        };
        if (data.no !== null && data.no !== undefined) {
          updatePayload.no = data.no;
        }
        await Santri.update(updatePayload, {
          where: { id_santri: data.id_santri },
        });
        successUpdated.push(data);
      }
    }

    const totalSuccess = successCreated.length + successUpdated.length;

    return h
      .response({
        success: true,
        message: "Import selesai",
        summary: {
          total_rows_in_file: dataFromExcel.length,
          success_count: totalSuccess,
          created_count: successCreated.length,
          updated_count: successUpdated.length,
          failed_count: failedImports.length,
          duplicate_count: duplicates.length,
        },
        details: {
          successful_imports: [...successCreated, ...successUpdated],
          created_santri: successCreated,
          updated_santri: successUpdated,
          failed_imports: failedImports,
          duplicates: duplicates,
        },
      })
      .code(200);
  } catch (error) {
    console.error("Error importing santri:", error);
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
