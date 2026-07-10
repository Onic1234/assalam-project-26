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
      "ID SANTRI": "id_santri",
      "Nama Santri": "nama_santri",
      "N A M A": "nama_santri",
      "Nama": "nama_santri",
      "L/P": "jenis_kelamin",
      "Kelas": "kelas",
      "KELAS": "kelas",
      "Unit": "unit",
      "UNIT": "unit",
      "NO": "no",
      "No": "no",
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
    uniqueKey: "Nama",
    requiredFields: ["Nama", "Tanggal_Kadaluarsa"],
    fieldMapping: {
      "ID Member": "id_member",
      "ID_MEMBER": "id_member",
      id_member: "id_member",
      "Nama Lengkap": "Nama",
      Nama: "Nama",
      "Jenis Kelamin": "Jenis_Kelamin",
      "L/P": "Jenis_Kelamin",
      "Jenis Member": "Jenis_Member",
      "Tanggal Daftar": "Dibuat",
      "Tanggal Berakhir": "Tanggal_Kadaluarsa",
      Tanggal_Kadaluarsa: "Tanggal_Kadaluarsa",
    },
    templateColumns: [
      { header: "ID Member", key: "id_member", width: 15 },
      { header: "Nama Lengkap", key: "Nama", width: 30 },
      { header: "Jenis Kelamin", key: "Jenis_Kelamin", width: 15 },
      { header: "Jenis Member", key: "Jenis_Member", width: 20 },
      { header: "Tanggal Daftar", key: "Dibuat", width: 20 },
      { header: "Tanggal Berakhir", key: "Tanggal_Kadaluarsa", width: 20 },
    ],
  },
};

const getCellValue = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if (val.result !== undefined) {
      return val.result;
    }
    if (val.richText !== undefined) {
      return val.richText.map((t) => t.text).join("");
    }
    if (val.text !== undefined) {
      return val.text;
    }
  }
  return val;
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

      const { model, uniqueKey, fieldMapping, requiredFields } = config;

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      let bestSheet = workbook.worksheets[0];
      let headerRowNumber = 1;
      let maxMatches = 0;
      let bestHeaders = [];

      for (const sheet of workbook.worksheets) {
        for (let r = 1; r <= Math.min(sheet.rowCount, 20); r++) {
          const row = sheet.getRow(r);
          const currentHeaders = [];
          const rowValues = row.values;
          if (rowValues) {
            for (let c = 1; c < rowValues.length; c++) {
              currentHeaders.push(String(getCellValue(rowValues[c]) || "").trim());
            }
          }

          let matches = 0;
          for (const h of currentHeaders) {
            if (h && fieldMapping[h]) {
              matches++;
            }
          }

          if (matches > maxMatches) {
            maxMatches = matches;
            bestSheet = sheet;
            headerRowNumber = r;
            bestHeaders = currentHeaders;
          }
        }
      }

      if (maxMatches === 0) {
        bestSheet = workbook.worksheets[0];
        headerRowNumber = 1;
        bestHeaders = [];
        const firstRow = bestSheet.getRow(1).values;
        if (firstRow) {
          for (let c = 1; c < firstRow.length; c++) {
            bestHeaders.push(String(getCellValue(firstRow[c]) || "").trim());
          }
        }
      }

      const worksheet = bestSheet;
      const dataFromExcel = [];
      const headers = bestHeaders;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > headerRowNumber) {
          const rowData = {};
          const rowValues = row.values;
          if (rowValues) {
            for (let c = 1; c < rowValues.length; c++) {
              const header = headers[c - 1];
              if (header) {
                rowData[header] = getCellValue(rowValues[c]);
              }
            }
          }

          if (Object.keys(rowData).length > 0) {
            const isHeaderDuplicate = Object.keys(rowData).every(
              (key) => String(rowData[key] || "").trim() === key
            );

            const nameKey = Object.keys(fieldMapping).find(
              (k) =>
                fieldMapping[k] === "Nama" ||
                fieldMapping[k] === "nama_santri" ||
                fieldMapping[k] === "Username"
            );
            const nameVal = nameKey ? String(rowData[nameKey] || "").trim() : "";

            if (!isHeaderDuplicate && nameVal !== "") {
              dataFromExcel.push({ rowNumber, data: rowData });
            }
          }
        }
      });

      if (dataFromExcel.length === 0) {
        return Boom.badRequest("File Excel kosong atau tidak memiliki data");
      }

      const uniqueKeysFromExcel = dataFromExcel
        .map((item) => {
          const matchingExcelHeaders = Object.keys(fieldMapping).filter(
            (key) => fieldMapping[key] === uniqueKey
          );
          const header = matchingExcelHeaders.find((h) => item.data[h] !== undefined) || uniqueKey;
          return String(item.data[header] || "").trim();
        })
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

        // Normalisasi Jenis Kelamin (L/P)
        const jkField = mappedData.jenis_kelamin !== undefined ? "jenis_kelamin" : "Jenis_Kelamin";
        if (mappedData[jkField] !== undefined) {
          const jk = String(mappedData[jkField]).trim().toUpperCase();
          if (jk.startsWith("L")) {
            mappedData[jkField] = "L";
          } else if (jk.startsWith("P")) {
            mappedData[jkField] = "P";
          } else {
            mappedData[jkField] = null;
          }
        }

        // Parse format tanggal jika dikirim sebagai string
        for (const dateField of ["Tanggal_Kadaluarsa", "Dibuat"]) {
          if (mappedData[dateField]) {
            const rawDate = mappedData[dateField];
            if (typeof rawDate === "string") {
              const parts = rawDate.split(/[-/ ]/);
              if (parts.length >= 3) {
                if (parts[2].length === 4) {
                  mappedData[dateField] = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else if (parts[0].length === 4) {
                  mappedData[dateField] = new Date(rawDate);
                }
              } else {
                const parsed = new Date(rawDate);
                if (!isNaN(parsed.getTime())) {
                  mappedData[dateField] = parsed;
                }
              }
            } else if (rawDate instanceof Date) {
              if (isNaN(rawDate.getTime())) {
                delete mappedData[dateField];
              }
            }
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
