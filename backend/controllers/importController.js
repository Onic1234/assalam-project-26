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
      id_santri: "id_santri",
      "Nama Santri": "nama_santri",
      "N A M A": "nama_santri",
      "Nama": "nama_santri",
      nama_santri: "nama_santri",
      "L/P": "jenis_kelamin",
      "Jenis Kelamin": "jenis_kelamin",
      jenis_kelamin: "jenis_kelamin",
      "Kelas": "kelas",
      "KELAS": "kelas",
      kelas: "kelas",
      "Unit": "unit",
      "UNIT": "unit",
      unit: "unit",
      "NO": "no",
      "No": "no",
      no: "no",
    },
    templateColumns: [
      { header: "NO", key: "no", width: 5 },
      { header: "ID Santri", key: "id_santri", width: 15 },
      { header: "Nama Santri", key: "nama_santri", width: 30 },
      { header: "L/P", key: "jenis_kelamin", width: 5 },
      { header: "Kelas", key: "kelas", width: 10 },
      { header: "Unit", key: "unit", width: 10 },
    ],
    sampleRow: {
      no: 1,
      id_santri: "2425573",
      nama_santri: "ACHMAD ALTHIEGO ZIDNY KAMAL",
      jenis_kelamin: "L",
      kelas: "X",
      unit: "SMA",
    },
  },
  ppmi: {
    model: PPMI,
    uniqueKey: "Username",
    requiredFields: ["Username"],
    fieldMapping: {
      Username: "Username",
      USERNAME: "Username",
      username: "Username",
      "Nama Username": "Username",
    },
    templateColumns: [{ header: "Username", key: "Username", width: 30 }],
    sampleRow: { Username: "ppmi_user1" },
  },
  staff: {
    model: Staff,
    uniqueKey: "No_WhatsApp",
    requiredFields: ["Nama", "Gender", "No_WhatsApp"],
    fieldMapping: {
      Nama: "Nama",
      NAMA: "Nama",
      "Nama Staff": "Nama",
      "Nama Lengkap": "Nama",
      "Nama Karyawan": "Nama",
      "N A M A": "Nama",
      nama: "Nama",

      Gender: "Gender",
      GENDER: "Gender",
      "Jenis Kelamin": "Gender",
      "JENIS KELAMIN": "Gender",
      "Jenis_Kelamin": "Gender",
      "L/P": "Gender",
      JK: "Gender",
      gender: "Gender",

      No_WhatsApp: "No_WhatsApp",
      NO_WHATSAPP: "No_WhatsApp",
      "No. WhatsApp": "No_WhatsApp",
      "No.WhatsApp": "No_WhatsApp",
      "No WhatsApp": "No_WhatsApp",
      "No HP": "No_WhatsApp",
      "No. HP": "No_WhatsApp",
      "No.HP": "No_WhatsApp",
      "No WA": "No_WhatsApp",
      "No. WA": "No_WhatsApp",
      WhatsApp: "No_WhatsApp",
      WA: "No_WhatsApp",
      No_WA: "No_WhatsApp",
      no_whatsapp: "No_WhatsApp",
      "No Telepon": "No_WhatsApp",
      "No. Telepon": "No_WhatsApp",
      Telepon: "No_WhatsApp",
    },
    templateColumns: [
      { header: "Nama", key: "Nama", width: 30 },
      { header: "Gender", key: "Gender", width: 10 },
      { header: "No_WhatsApp", key: "No_WhatsApp", width: 20 },
    ],
    sampleRow: {
      Nama: "Ahmad Karyawan",
      Gender: "L",
      No_WhatsApp: "081234567890",
    },
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
      NAMA: "Nama",
      "Jenis Kelamin": "Jenis_Kelamin",
      "JENIS KELAMIN": "Jenis_Kelamin",
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
    sampleRow: {
      id_member: "MBR001",
      Nama: "Budi Member",
      Jenis_Kelamin: "L",
      Jenis_Member: "VIP",
      Dibuat: "2026-01-01",
      Tanggal_Kadaluarsa: "2027-01-01",
    },
  },
};

const getCellValue = (val) => {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) return val;
  if (typeof val === "object") {
    if (val.result !== undefined && val.result !== null) {
      return getCellValue(val.result);
    }
    if (Array.isArray(val.richText)) {
      return val.richText.map((t) => (typeof t === "object" ? t.text || "" : String(t))).join("");
    }
    if (val.text !== undefined && val.text !== null) {
      return getCellValue(val.text);
    }
    if (val.value !== undefined && val.value !== null) {
      return getCellValue(val.value);
    }
    if (val.error !== undefined) {
      return "";
    }
    return "";
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
              (key) => String(getCellValue(rowData[key]) || "").trim() === key
            );

            // Cek apakah ada minimal 1 isi data utama di baris ini
            const hasValidContent = Object.keys(fieldMapping).some((headerKey) => {
              const val = getCellValue(rowData[headerKey]);
              return val !== undefined && val !== null && String(val).trim() !== "";
            });

            if (!isHeaderDuplicate && hasValidContent) {
              dataFromExcel.push({ rowNumber, data: rowData });
            }
          }
        }
      });

      if (dataFromExcel.length === 0) {
        return Boom.badRequest("File Excel kosong atau tidak memiliki data yang valid");
      }

      const uniqueKeysFromExcel = dataFromExcel
        .map((item) => {
          let val = "";
          for (const excelHeader in fieldMapping) {
            if (
              fieldMapping[excelHeader] === uniqueKey &&
              item.data[excelHeader] !== undefined &&
              item.data[excelHeader] !== null
            ) {
              val = String(getCellValue(item.data[excelHeader])).trim();
              if (val !== "") break;
            }
          }
          if (!val && item.data[uniqueKey] !== undefined && item.data[uniqueKey] !== null) {
            val = String(getCellValue(item.data[uniqueKey])).trim();
          }

          // Normalisasi No_WhatsApp jika uniqueKey-nya adalah No_WhatsApp
          if (uniqueKey === "No_WhatsApp" && val !== "") {
            val = val.replace(/[^0-9]/g, "");
            if (val.startsWith("62")) {
              val = "0" + val.slice(2);
            } else if (val.length > 0 && !val.startsWith("0")) {
              val = "0" + val;
            }
          }

          return val;
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
      const dataToUpdate = [];
      const failedImports = [];
      const duplicates = [];
      const processedInFile = new Set();

      for (const item of dataFromExcel) {
        const mappedData = {};
        for (const excelHeader in fieldMapping) {
          if (item.data[excelHeader] !== undefined && item.data[excelHeader] !== null) {
            let extractedVal = getCellValue(item.data[excelHeader]);
            if (typeof extractedVal === "object" && !(extractedVal instanceof Date)) {
              extractedVal = String(extractedVal || "");
            }
            mappedData[fieldMapping[excelHeader]] = extractedVal;
          }
        }

        // Normalisasi Jenis Kelamin / Gender (L/P) untuk Staff, Santri, maupun Member
        const jkField = ["jenis_kelamin", "Jenis_Kelamin", "Gender"].find(
          (f) => mappedData[f] !== undefined
        );
        if (jkField && mappedData[jkField] !== undefined && mappedData[jkField] !== null) {
          const jk = String(mappedData[jkField]).trim().toUpperCase();
          if (jk.startsWith("L") || jk.includes("LAKI")) {
            mappedData[jkField] = "L";
          } else if (jk.startsWith("P") || jk.includes("PEREMPUAN") || jk.includes("WANITA")) {
            mappedData[jkField] = "P";
          } else {
            mappedData[jkField] = null;
          }
        }

        // Normalisasi No_WhatsApp (format string, awalan 08..., hapus karakter non-digit)
        if (mappedData.No_WhatsApp !== undefined && mappedData.No_WhatsApp !== null) {
          let wa = String(mappedData.No_WhatsApp).trim();
          wa = wa.replace(/[^0-9]/g, "");
          if (wa.startsWith("62")) {
            wa = "0" + wa.slice(2);
          } else if (wa.length > 0 && !wa.startsWith("0")) {
            wa = "0" + wa;
          }
          mappedData.No_WhatsApp = wa;
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
            error: `Kolom wajib kosong atau tidak valid: ${missingFields.join(", ")}`,
          });
          continue;
        }

        if (processedInFile.has(uniqueValue)) {
          duplicates.push({
            row: item.rowNumber,
            data: mappedData,
            error: `${uniqueKey} duplikat di dalam file Excel`,
          });
          continue;
        }
        processedInFile.add(uniqueValue);

        if (existingKeysInDb.has(uniqueValue)) {
          dataToUpdate.push(mappedData);
        } else {
          newDataToCreate.push(mappedData);
        }
      }

      let successCreated = [];
      if (newDataToCreate.length > 0) {
        successCreated = await model.bulkCreate(newDataToCreate, {
          returning: true,
        });
      }

      let successUpdated = [];
      if (dataToUpdate.length > 0) {
        for (const data of dataToUpdate) {
          const { [uniqueKey]: keyVal, ...updatePayload } = data;
          await model.update(updatePayload, {
            where: { [uniqueKey]: keyVal },
          });
          successUpdated.push(data);
        }
      }

      const totalSuccess = successCreated.length + successUpdated.length;

      return h
        .response({
          success: true,
          message: `Import untuk kategori '${kategori}' selesai`,
          summary: {
            total_rows_in_file: dataFromExcel.length,
            success_count: totalSuccess,
            created_count: successCreated.length,
            updated_count: successUpdated.length,
            failed_count: failedImports.length,
            duplicate_count: duplicates.length,
          },
          details: {
            successImports: [...successCreated, ...successUpdated],
            created_data: successCreated,
            updated_data: successUpdated,
            failedImports,
            duplicates,
          },
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

      if (config.sampleRow) {
        worksheet.addRow(config.sampleRow);
      }

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
