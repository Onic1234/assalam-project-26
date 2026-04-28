// controllers/ticketingController.js
const {
  Penjualan,
  Reguler,
  Staff,
  PPMI,
  Santri,
  Member,
} = require("../models");
const { Op } = require("sequelize"); // <-- BARIS INI DITAMBAHKAN
const Boom = require("@hapi/boom");
const ExcelJS = require("exceljs");
const {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} = require("date-fns");

// --- HELPER BARU ---
const calculateEuclideanDistance = (desc1, desc2) => {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    sum += (desc1[i] - desc2[i]) ** 2;
  }
  return Math.sqrt(sum);
};

// Helper untuk mencatat penjualan
const createSale = async (
  customer,
  kategori,
  kuantitas,
  metodePembayaran = null
) => {
  return await Penjualan.create({
    CustomerId: customer.id,
    Kategori: kategori,
    Kuantitas: kuantitas,
    Metode_Pembayaran: metodePembayaran,
    Tanggal_Kunjungan: new Date(),
  });
};

// Ticketing untuk Umum/Reguler
exports.ticketForReguler = async (request, h) => {
  const { Nama, No_Telepon, Kuantitas, Metode_Pembayaran } = request.payload;
  try {
    const [customer] = await Reguler.findOrCreate({
      where: { No_Telepon },
      defaults: { Nama, No_Telepon },
    });
    const sale = await createSale(
      customer,
      "Reguler",
      Kuantitas,
      Metode_Pembayaran
    );
    return h
      .response({ message: "Tiket berhasil dibuat.", data: sale })
      .code(201);
  } catch (error) {
    return h
      .response({
        message: "Gagal membuat tiket Reguler.",
        error: error.message,
      })
      .code(400);
  }
};

// Ticketing untuk Staff
exports.ticketForStaff = async (request, h) => {
  const { No_WhatsApp, Kuantitas, Metode_Pembayaran } = request.payload;
  try {
    const customer = await Staff.findOne({ where: { No_WhatsApp } });
    if (!customer)
      return Boom.notFound(
        "Staff dengan No. WhatsApp tersebut tidak ditemukan."
      );

    const sale = await createSale(
      customer,
      "Staff",
      Kuantitas,
      Metode_Pembayaran
    );

    // Menambahkan nama Staff ke dalam data response
    return h
      .response({
        message: "Tiket berhasil dibuat.",
        data: {
          ...sale.toJSON(),
          customerName: customer.Nama, // Menambahkan nama
        },
      })
      .code(201);
  } catch (error) {
    return Boom.internal("Gagal membuat tiket Staff.", error.message);
  }
};

/**
 * --- FUNGSI INI DIPERBARUI ---
 * Membuat tiket berdasarkan pencocokan Face Descriptor.
 */
const ticketByFaceId = async (request, h, Model, kategori, nameField) => {
  const { faceDescriptor } = request.payload;
  const FACE_RECOGNITION_THRESHOLD = 0.6;

  if (
    !faceDescriptor ||
    !Array.isArray(faceDescriptor) ||
    faceDescriptor.length !== 128
  ) {
    return Boom.badRequest(
      "faceDescriptor harus berupa array berisi 128 angka."
    );
  }

  try {
    const allCustomersWithFaceId = await Model.findAll({
      where: { FaceID: { [Op.ne]: null } },
    });

    let bestMatch = null;
    let minDistance = Infinity;

    for (const customer of allCustomersWithFaceId) {
      try {
        const storedDescriptor = JSON.parse(customer.FaceID);
        const distance = calculateEuclideanDistance(
          faceDescriptor,
          storedDescriptor
        );
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = customer;
        }
      } catch (e) {
        console.error(
          `Could not parse FaceID for ${kategori} ID ${customer.id}:`,
          customer.FaceID
        );
        continue;
      }
    }

    if (bestMatch && minDistance <= FACE_RECOGNITION_THRESHOLD) {
      const sale = await createSale(bestMatch, kategori, 1);
      // Menambahkan nama customer yang cocok ke dalam data response
      return h
        .response({
          message: "Tiket berhasil dibuat.",
          data: {
            ...sale.toJSON(),
            customerName: bestMatch[nameField], // Mengambil nama dari field yang sesuai
          },
        })
        .code(201);
    } else {
      return Boom.notFound(`Wajah tidak dikenali untuk kategori ${kategori}.`);
    }
  } catch (error) {
    console.error(`Error creating ticket for ${kategori}:`, error);
    return Boom.internal(`Gagal membuat tiket ${kategori}.`);
  }
};

exports.getAllTicketSales = async (request, h) => {
  try {
    const { page = 1, limit = 10 } = request.query;
    const offset = (page - 1) * parseInt(limit);

    const { count, rows: sales } = await Penjualan.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: offset,
    });

    const salesWithCustomerData = await Promise.all(
      sales.map(async (sale) => {
        const saleJson = sale.toJSON();
        let customer = null;
        let customerName = "N/A";

        const models = {
          Reguler: { model: Reguler, nameField: "Nama" },
          Staff: { model: Staff, nameField: "Nama" },
          PPMI: { model: PPMI, nameField: "Username" },
          Santri: { model: Santri, nameField: "nama_santri" },
          Member: { model: Member, nameField: "Nama" },
        };

        const customerInfo = models[sale.Kategori];
        if (customerInfo) {
          customer = await customerInfo.model.findByPk(sale.CustomerId, {
            attributes: [customerInfo.nameField],
          });
          if (customer) {
            customerName = customer[customerInfo.nameField];
          }
        }

        saleJson.customerName = customerName;
        return saleJson;
      })
    );

    return h
      .response({
        success: true,
        message: "Data penjualan tiket berhasil diambil.",
        data: salesWithCustomerData,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page),
        },
      })
      .code(200);
  } catch (error) {
    console.error("Error getting ticket sales:", error);
    return Boom.internal("Gagal mengambil data penjualan tiket.");
  }
};

/**
 * --- PERBAIKAN: HELPER FUNCTION UNTUK EKSPOR ---
 * Fungsi ini didefinisikan di sini agar dapat diakses oleh `exportSalesToExcel`.
 */
const getFullSalesData = async () => {
  const sales = await Penjualan.findAll({
    order: [["Tanggal_Kunjungan", "DESC"]],
  });

  return Promise.all(
    sales.map(async (sale) => {
      const saleJson = sale.toJSON();
      let customerName = "N/A";

      const models = {
        Reguler: { model: Reguler, nameField: "Nama" },
        Staff: { model: Staff, nameField: "Nama" },
        PPMI: { model: PPMI, nameField: "Username" },
        Santri: { model: Santri, nameField: "nama_santri" },
        Member: { model: Member, nameField: "Nama" },
      };

      const customerInfo = models[sale.Kategori];
      if (customerInfo && sale.CustomerId) {
        const customer = await customerInfo.model.findByPk(sale.CustomerId, {
          attributes: [customerInfo.nameField],
        });
        if (customer) {
          customerName = customer[customerInfo.nameField];
        }
      }
      saleJson.customerName = customerName;
      return saleJson;
    })
  );
};

/**
 * --- FUNGSI BARU UNTUK EKSPOR EXCEL ---
 */
exports.exportSalesToExcel = async (request, h) => {
  try {
    const salesData = await getFullSalesData();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistem Tiket";
    workbook.created = new Date();

    const now = new Date();

    // Filter data untuk setiap worksheet
    const dailyData = salesData.filter((d) => {
      const visitDate = new Date(d.Tanggal_Kunjungan);
      return visitDate >= startOfDay(now) && visitDate <= endOfDay(now);
    });
    const weeklyData = salesData.filter((d) => {
      const visitDate = new Date(d.Tanggal_Kunjungan);
      return (
        visitDate >= startOfWeek(now, { weekStartsOn: 1 }) &&
        visitDate <= endOfWeek(now, { weekStartsOn: 1 })
      );
    });
    const monthlyData = salesData.filter((d) => {
      const visitDate = new Date(d.Tanggal_Kunjungan);
      return visitDate >= startOfMonth(now) && visitDate <= endOfMonth(now);
    });
    const yearlyData = salesData.filter((d) => {
      const visitDate = new Date(d.Tanggal_Kunjungan);
      return visitDate >= startOfYear(now) && visitDate <= endOfYear(now);
    });

    // Helper untuk membuat worksheet
    const addSheet = (sheetName, data) => {
      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = [
        { header: "Nama Pembeli", key: "customerName", width: 30 },
        {
          header: "Tanggal Kunjungan",
          key: "Tanggal_Kunjungan",
          width: 25,
          style: { numFmt: "dd/mm/yyyy hh:mm:ss" },
        },
        { header: "Kategori Pengunjung", key: "Kategori", width: 20 },
        { header: "Metode Pembayaran", key: "Metode_Pembayaran", width: 20 },
        {
          header: "Kuantitas",
          key: "Kuantitas",
          width: 15,
          style: { alignment: { horizontal: "right" } },
        },
      ];

      // Style untuk header
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

      // Menambahkan data ke baris
      data.forEach((sale) => {
        sheet.addRow({
          ...sale,
          Tanggal_Kunjungan: new Date(sale.Tanggal_Kunjungan),
          Metode_Pembayaran: sale.Metode_Pembayaran || "Tunai", // Default jika null
        });
      });
    };

    // Membuat semua worksheet
    addSheet("Laporan Harian", dailyData);
    addSheet("Laporan Mingguan", weeklyData);
    addSheet("Laporan Bulanan", monthlyData);
    addSheet("Laporan Tahunan", yearlyData);
    addSheet("Semua Data", salesData);

    // Menyiapkan file untuk di-download
    const fileName = `Laporan_Penjualan_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    return h
      .response(buffer)
      .header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .header("Content-Disposition", `attachment; filename=${fileName}`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return Boom.internal("Gagal mengekspor data ke Excel.", error);
  }
};

exports.ticketForPPMI = (request, h) =>
  ticketByFaceId(request, h, PPMI, "PPMI", "Username");
exports.ticketForSantri = (request, h) =>
  ticketByFaceId(request, h, Santri, "Santri", "nama_santri");
exports.ticketForMember = (request, h) =>
  ticketByFaceId(request, h, Member, "Member", "Nama");
