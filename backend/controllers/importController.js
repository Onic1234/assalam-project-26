// controllers/importController.js
const ExcelJS = require("exceljs");
const { Santri, PPMI, Staff, Member } = require("../models");
const Boom = require("@hapi/boom");

// Konfigurasi untuk setiap tipe customer yang bisa diimpor
const importConfig = {
  santri: {
    model: Santri,
    uniqueKey: "id_santri",
    requiredFields: [
      "id_santri",
      "nama_santri",
      "jenis_kelamin",
      "kelas",
      "unit",
    ],
    fieldMapping: {
      "ID Santri": "id_santri",
      "Nama Santri": "nama_santri",
      "L/P": "jenis_kelamin",
      Kelas: "kelas",
      Unit: "unit",
      NO: "no",
    },
    templateColumns: [
      { header: "NO", key: "no", width: 5 },
      { header: "ID Santri", key: "id_santri", width: 15 },
      { header: "Nama Santri", key: "nama_santri", width: 30 },
      { header: "L/P", key: "jenis_kelamin", width: 5 },
      { header: "Kelas", key: "kelas", width: 10 },
      { header: "Unit", key: "unit", width: 10 },
    ],
  },
  ppmi: {
    model: PPMI,
    uniqueKey: "Username",
    requiredFields: ["Username"],
    fieldMapping: { Username: "Username" },
    templateColumns: [{ header: "Username", key: "Username", width: 30 }],
  },
  staff: {
    model: Staff,
    uniqueKey: "No_WhatsApp", // Diubah menjadi No_WhatsApp
    requiredFields: ["Nama", "Gender", "No_WhatsApp"], // No_WhatsApp sekarang wajib
    fieldMapping: {
      Nama: "Nama",
      Gender: "Gender",
      No_WhatsApp: "No_WhatsApp",
    },
    templateColumns: [
      { header: "Nama", key: "Nama", width: 30 },
      { header: "Gender", key: "Gender", width: 10 },
      { header: "No_WhatsApp", key: "No_WhatsApp", width: 20 },
    ],
  },
  member: {
    model: Member,
    uniqueKey: "No_Telepon",
    requiredFields: ["Nama", "No_Telepon", "Tanggal_Kadaluarsa"],
    fieldMapping: {
      Nama: "Nama",
      No_Telepon: "No_Telepon",
      Tanggal_Kadaluarsa: "Tanggal_Kadaluarsa",
    },
    templateColumns: [
      { header: "Nama", key: "Nama", width: 30 },
      { header: "No_Telepon", key: "No_Telepon", width: 20 },
      { header: "Tanggal_Kadaluarsa", key: "Tanggal_Kadaluarsa", width: 20 },
    ],
  },
};

const importController = {
  /**
   * Fungsi generik untuk mengimpor data dari Excel berdasarkan kategori.
   */
  importData: async (request, h) => {
    try {
      const { kategori } = request.params;
      const config = importConfig[kategori.toLowerCase()];

      if (!config) {
        return Boom.badRequest("Kategori customer tidak valid.");
      }

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

      const { model, uniqueKey, fieldMapping, requiredFields } = config;

      const uniqueKeysFromExcel = dataFromExcel
        .map((item) =>
          String(
            item.data[
              Object.keys(fieldMapping).find(
                (key) => fieldMapping[key] === uniqueKey
              )
            ] || ""
          ).trim()
        )
        .filter(Boolean);

      const existingRecords = await model.findAll({
        where: { [uniqueKey]: uniqueKeysFromExcel },
        attributes: [uniqueKey],
      });
      const existingKeysInDb = new Set(
        existingRecords.map((r) => r[uniqueKey])
      );

      const newDataToCreate = [];
      const failedImports = [];
      const duplicates = [];
      const processedKeys = new Set(existingKeysInDb);

      for (const item of dataFromExcel) {
        const mappedData = {};
        for (const excelHeader in fieldMapping) {
          if (item.data[excelHeader] !== undefined) {
            mappedData[fieldMapping[excelHeader]] = item.data[excelHeader];
          }
        }

        const uniqueValue = String(mappedData[uniqueKey] || "").trim();

        const missingFields = requiredFields.filter(
          (field) => !mappedData[field]
        );
        if (missingFields.length > 0) {
          failedImports.push({
            row: item.rowNumber,
            data: mappedData,
            error: `Kolom wajib kosong: ${missingFields.join(", ")}`,
          });
          continue;
        }

        if (processedKeys.has(uniqueValue)) {
          duplicates.push({
            row: item.rowNumber,
            data: mappedData,
            error: `${uniqueKey} duplikat`,
          });
          continue;
        }

        newDataToCreate.push(mappedData);
        processedKeys.add(uniqueValue);
      }

      let successImports = [];
      if (newDataToCreate.length > 0) {
        successImports = await model.bulkCreate(newDataToCreate, {
          returning: true,
        });
      }

      return h
        .response({
          success: true,
          message: `Import untuk kategori '${kategori}' selesai`,
          summary: {
            total_rows_in_file: dataFromExcel.length,
            success_count: successImports.length,
            failed_count: failedImports.length,
            duplicate_count: duplicates.length,
          },
          details: { successImports, failedImports, duplicates },
        })
        .code(200);
    } catch (error) {
      console.error(
        `Error importing data for ${request.params.kategori}:`,
        error
      );
      return Boom.internal(
        "Terjadi kesalahan pada server saat mengimport data"
      );
    }
  },

  /**
   * Fungsi generik untuk mengunduh template Excel berdasarkan kategori.
   */
  downloadTemplate: async (request, h) => {
    try {
      const { kategori } = request.params;
      const config = importConfig[kategori.toLowerCase()];

      if (!config) {
        return Boom.badRequest("Kategori customer tidak valid.");
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Template Data ${kategori}`);

      worksheet.columns = config.templateColumns;
      worksheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();

      return h
        .response(buffer)
        .header(
          "Content-Disposition",
          `attachment; filename=template_data_${kategori}.xlsx`
        )
        .type(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
    } catch (error) {
      console.error(
        `Error generating template for ${request.params.kategori}:`,
        error
      );
      return Boom.internal("Gagal membuat template");
    }
  },
};

module.exports = importController;
