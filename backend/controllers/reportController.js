// controllers/reportController.js
const {
  Transaksi,
  Transaction_detail,
  Produk,
  Penjualan,
  Santri,
  Balance,
  Category,
  sequelize,
  Admin,
} = require("../models");
const { Op } = require("sequelize");
const Boom = require("@hapi/boom");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

// Helper function untuk menghitung rentang tanggal berdasarkan periode
const getDateRange = (period) => {
  const now = new Date();
  let startDate;
  // Set endDate ke akhir hari ini
  const endDate = new Date(new Date().setHours(23, 59, 59, 999));

  switch (period) {
    case "daily":
      // Mulai dari awal hari ini
      startDate = new Date(new Date().setHours(0, 0, 0, 0));
      break;
    case "weekly":
      // Mulai dari hari pertama minggu ini (Minggu)
      const firstDayOfWeek = now.getDate() - now.getDay();
      startDate = new Date(now.setDate(firstDayOfWeek));
      startDate.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      // Mulai dari tanggal 1 bulan ini
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yearly":
      // Mulai dari 1 Januari tahun ini
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }
  return { startDate, endDate };
};

const reportController = {
  /**
   * 1. Ringkasan Transaksi (berdasarkan tipe: TopUp vs Pembelian)
   */
  getTransactionSummary: async (request, h) => {
    try {
      const {
        period,
        startDate: reqStartDate,
        endDate: reqEndDate,
      } = request.query;
      let startDate, endDate;
      const whereClause = {}; // Inisialisasi whereClause kosong

      if (period) {
        const range = getDateRange(period);
        if (!range) return Boom.badRequest("Periode tidak valid.");
        startDate = range.startDate;
        endDate = range.endDate;
        whereClause.createdAt = { [Op.between]: [startDate, endDate] };
      } else if (reqStartDate && reqEndDate) {
        startDate = reqStartDate;
        endDate = reqEndDate;
        whereClause.createdAt = { [Op.between]: [startDate, endDate] };
      }

      const summary = await Transaksi.findAll({
        where: whereClause,
        attributes: [
          "payment_method",
          [sequelize.fn("SUM", sequelize.col("total_amount")), "totalAmount"],
          [sequelize.fn("COUNT", sequelize.col("id")), "transactionCount"],
        ],
        group: ["payment_method"],
        raw: true,
      });

      let totalTopUp = 0;
      let totalPurchase = 0;
      let topUpCount = 0;
      let purchaseCount = 0;

      summary.forEach((item) => {
        if (item.payment_method === "TopUp") {
          totalTopUp = parseFloat(item.totalAmount);
          topUpCount = parseInt(item.transactionCount);
        } else {
          totalPurchase += parseFloat(item.totalAmount);
          purchaseCount += parseInt(item.transactionCount);
        }
      });

      return h
        .response({
          success: true,
          data: {
            period: { startDate, endDate },
            totalTopUp,
            totalPurchase,
            totalTransactions: topUpCount + purchaseCount,
            breakdown: summary, // Detail berdasarkan tipe pembayaran (Saldo, Tunai, dll)
          },
        })
        .code(200);
    } catch (error) {
      console.error("Error getting transaction summary:", error);
      return Boom.internal("Gagal mengambil ringkasan transaksi.");
    }
  },

  /**
   * 2. Mendapatkan Saldo Semua Santri
   */
  getAllSantriBalances: async (request, h) => {
    try {
      const santris = await Santri.findAll({
        attributes: ["id", "id_santri", "nama_santri"],
        include: [
          {
            model: Balance,
            as: "balance",
            attributes: ["amount"],
          },
        ],
        order: [["nama_santri", "ASC"]],
      });

      return h.response({ success: true, data: santris }).code(200);
    } catch (error) {
      console.error("Error getting all santri balances:", error);
      return Boom.internal("Gagal mengambil saldo santri.");
    }
  },

  /**
   * 4. Mendapatkan Produk Terlaris
   */
  getTopSellingProducts: async (request, h) => {
    try {
      const {
        period,
        startDate: reqStartDate,
        endDate: reqEndDate,
        limit = 5,
      } = request.query;
      let startDate, endDate;
      const whereClause = {};

      if (period) {
        const range = getDateRange(period);
        if (!range) return Boom.badRequest("Periode tidak valid.");
        whereClause.createdAt = {
          [Op.between]: [range.startDate, range.endDate],
        };
      } else if (reqStartDate && reqEndDate) {
        whereClause.createdAt = { [Op.between]: [reqStartDate, reqEndDate] };
      }

      const topProducts = await Transaction_detail.findAll({
        attributes: [
          "productId",
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantitySold"],
          // Menghitung total pendapatan: JUMLAH_TERJUAL * HARGA_SAAT_TRANSAKSI
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "`Transaction_detail`.`quantity` * `Transaction_detail`.`price`"
              )
            ),
            "totalRevenue",
          ],
        ],
        include: [
          {
            model: Transaksi,
            as: "transaction",
            where: whereClause,
            attributes: [],
          },
          // Menyertakan data harga dan stok saat ini dari tabel Produk
          {
            model: Produk,
            as: "product",
            attributes: ["name", "price", "stock"],
          },
        ],
        group: ["productId", "product.id"], // Group by product ID
        order: [[sequelize.literal("totalQuantitySold"), "DESC"]],
        limit: parseInt(limit),
      });

      // Memformat hasil agar lebih mudah dibaca oleh frontend
      const formattedData = topProducts.map((item) => {
        const plainItem = item.get({ plain: true });
        return {
          productId: plainItem.productId,
          name: plainItem.product.name,
          currentPrice: plainItem.product.price,
          currentStock: plainItem.product.stock,
          totalQuantitySold: parseInt(plainItem.totalQuantitySold) || 0,
          totalRevenue: parseInt(plainItem.totalRevenue) || 0,
        };
      });

      return h.response({ success: true, data: formattedData }).code(200);
    } catch (error) {
      console.error("Error getting top selling products:", error);
      return Boom.internal("Gagal mengambil produk terlaris.");
    }
  },

  /**
   * 5. Mendapatkan Kategori Populer
   */
  getPopularCategories: async (request, h) => {
    try {
      const {
        period,
        startDate: reqStartDate,
        endDate: reqEndDate,
        limit = 5,
      } = request.query;
      let startDate, endDate;
      const whereClause = {};

      if (period) {
        const range = getDateRange(period);
        if (!range) return Boom.badRequest("Periode tidak valid.");
        whereClause.createdAt = {
          [Op.between]: [range.startDate, range.endDate],
        };
      } else if (reqStartDate && reqEndDate) {
        whereClause.createdAt = { [Op.between]: [reqStartDate, reqEndDate] };
      }

      const popularCategories = await Transaction_detail.findAll({
        attributes: [
          // Menghitung total item terjual
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalItemsSold"],
          // Menghitung total pendapatan
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "`Transaction_detail`.`quantity` * `Transaction_detail`.`price`"
              )
            ),
            "totalRevenue",
          ],
          // Menghitung jumlah produk unik yang terjual dari kategori ini
          [
            sequelize.fn(
              "COUNT",
              sequelize.fn(
                "DISTINCT",
                sequelize.col("`Transaction_detail`.`productId`")
              )
            ),
            "uniqueProductsSold",
          ],
          // Menghitung jumlah transaksi unik yang melibatkan kategori ini
          [
            sequelize.fn(
              "COUNT",
              sequelize.fn("DISTINCT", sequelize.col("`transaction`.`id`"))
            ),
            "transactionCount",
          ],
        ],
        include: [
          {
            model: Transaksi,
            as: "transaction",
            where: whereClause,
            attributes: [],
          },
          {
            model: Produk,
            as: "product",
            attributes: [],
            include: [
              { model: Category, as: "category", attributes: ["id", "name"] },
            ],
          },
        ],
        group: ["product.category.id", "product.category.name"],
        order: [[sequelize.literal("totalRevenue"), "DESC"]],
        limit: parseInt(limit),
        raw: true,
      });

      // Memformat hasil dan menghitung rata-rata
      const formattedData = popularCategories.map((category) => {
        const totalItemsSold = parseInt(category.totalItemsSold) || 0;
        const transactionCount = parseInt(category.transactionCount) || 0;
        return {
          categoryId: category["product.category.id"],
          categoryName: category["product.category.name"],
          totalItemsSold,
          transactionCount,
          uniqueProductsSold: parseInt(category.uniqueProductsSold) || 0,
          totalRevenue: parseInt(category.totalRevenue) || 0,
          averageItemsPerTransaction:
            transactionCount > 0
              ? parseFloat((totalItemsSold / transactionCount).toFixed(2))
              : 0,
        };
      });

      return h.response({ success: true, data: formattedData }).code(200);
    } catch (error) {
      console.error("Error getting popular categories:", error);
      return Boom.internal("Gagal mengambil kategori populer.");
    }
  },
  /**
   * 6. Laporan Santri Individual
   */
  getIndividualSantriReport: async (request, h) => {
    try {
      const { santriId } = request.params;
      const {
        period,
        startDate: reqStartDate,
        endDate: reqEndDate,
      } = request.query;
      let startDate, endDate;

      if (period) {
        const range = getDateRange(period);
        if (!range) return Boom.badRequest("Periode tidak valid.");
        startDate = range.startDate;
        endDate = range.endDate;
      } else if (reqStartDate && reqEndDate) {
        startDate = reqStartDate;
        endDate = reqEndDate;
      } else {
        return Boom.badRequest(
          'Harap berikan parameter "period" atau "startDate" dan "endDate".'
        );
      }

      const whereClause = {
        santriId,
        createdAt: { [Op.between]: [startDate, endDate] },
      };

      const santri = await Santri.findByPk(santriId, {
        attributes: ["id", "nama_santri", "id_santri"],
      });
      if (!santri) return Boom.notFound("Santri tidak ditemukan.");

      const summary = await Transaksi.findAll({
        where: whereClause,
        attributes: [
          "payment_method",
          [sequelize.fn("SUM", sequelize.col("total_amount")), "totalAmount"],
        ],
        group: ["payment_method"],
        raw: true,
      });

      const transactions = await Transaksi.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
      });

      return h
        .response({
          success: true,
          data: {
            santri,
            period: { startDate, endDate },
            summary,
            transactions,
          },
        })
        .code(200);
    } catch (error) {
      console.error("Error getting individual santri report:", error);
      return Boom.internal("Gagal mengambil laporan santri.");
    }
  },

  /**
   * 7. Export Laporan Transaksi (CSV)
   */
  exportTransactionsCsv: async (request, h) => {
    try {
      const {
        period,
        startDate: reqStartDate,
        endDate: reqEndDate,
      } = request.query;
      let startDate, endDate;

      if (period) {
        const range = getDateRange(period);
        if (!range) return Boom.badRequest("Periode tidak valid.");
        startDate = range.startDate;
        endDate = range.endDate;
      } else if (reqStartDate && reqEndDate) {
        startDate = reqStartDate;
        endDate = reqEndDate;
      } else {
        return Boom.badRequest(
          'Harap berikan parameter "period" atau "startDate" dan "endDate".'
        );
      }

      const whereClause = { createdAt: { [Op.between]: [startDate, endDate] } };

      const transactions = await Transaksi.findAll({
        where: whereClause,
        include: [
          {
            model: Santri,
            as: "santri",
            attributes: ["id_santri", "nama_santri"],
            required: false,
          },
          { model: Admin, as: "kasir", attributes: ["username"] },
        ],
        order: [["createdAt", "ASC"]],
        raw: true,
      });

      if (transactions.length === 0) {
        return Boom.notFound(
          "Tidak ada data transaksi untuk diekspor pada periode ini."
        );
      }

      const fields = [
        { label: "ID Transaksi", value: "id" },
        { label: "Tanggal", value: "createdAt" },
        { label: "ID Santri", value: "santri.id_santri" },
        { label: "Nama Santri", value: "santri.nama_santri" },
        { label: "Kasir", value: "kasir.username" },
        { label: "Metode Pembayaran", value: "payment_method" },
        { label: "Total", value: "total_amount" },
      ];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(transactions);

      return h
        .response(csv)
        .header("Content-Type", "text/csv")
        .header(
          "Content-Disposition",
          `attachment; filename="laporan_transaksi.csv"`
        );
    } catch (error) {
      console.error("Error exporting transactions:", error);
      return Boom.internal("Gagal mengekspor laporan.");
    }
  },

  /**
   * 8. Dashboard Analytics
   */
  getDashboardAnalytics: async (request, h) => {
    try {
      const today = new Date();
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

      const whereToday = {
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      };

      const [santriCount, productCount, todaySummary] = await Promise.all([
        Santri.count(),
        Produk.count(),
        Transaksi.findOne({
          where: whereToday,
          attributes: [
            [
              sequelize.fn(
                "SUM",
                sequelize.literal(
                  "CASE WHEN payment_method != 'TopUp' THEN total_amount ELSE 0 END"
                )
              ),
              "dailyRevenue",
            ],
            [sequelize.fn("COUNT", sequelize.col("id")), "dailyTransactions"],
          ],
          raw: true,
        }),
      ]);

      return h
        .response({
          success: true,
          data: {
            totalSantri: santriCount,
            totalProducts: productCount,
            todayStats: {
              revenue: parseFloat(todaySummary.dailyRevenue) || 0,
              transactions: parseInt(todaySummary.dailyTransactions) || 0,
            },
          },
        })
        .code(200);
    } catch (error) {
      console.error("Error getting dashboard analytics:", error);
      return Boom.internal("Gagal mengambil data analitik.");
    }
  },

  /**
   * 8. Summary Transaksi Harian untuk Grafik
   */
  getDailyTransactionGraph: async (request, h) => {
    try {
      const {
        period,
        startDate: reqStartDate,
        endDate: reqEndDate,
      } = request.query;
      const whereClause = { payment_method: { [Op.ne]: "TopUp" } };

      if (period) {
        const range = getDateRange(period);
        if (!range) return Boom.badRequest("Periode tidak valid.");
        whereClause.createdAt = {
          [Op.between]: [range.startDate, range.endDate],
        };
      } else if (reqStartDate && reqEndDate) {
        whereClause.createdAt = { [Op.between]: [reqStartDate, reqEndDate] };
      }

      const dailyData = await Transaksi.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
          [sequelize.fn("SUM", sequelize.col("total_amount")), "totalRevenue"],
        ],
        group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
        order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
        raw: true,
      });

      return h.response({ success: true, data: dailyData }).code(200);
    } catch (error) {
      console.error("Error getting daily transaction graph:", error);
      return Boom.internal("Gagal mengambil data grafik transaksi harian.");
    }
  },
  /**
   * 9. Mendapatkan Aktivitas Transaksi Terkini untuk Dashboard
   */
  getRecentActivity: async (request, h) => {
    try {
      const recentTransactions = await Transaksi.findAll({
        limit: 5,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Santri,
            as: "santri",
            attributes: ["nama_santri"],
            required: false,
          },
        ],
        attributes: [
          "id",
          "total_amount",
          "payment_method",
          "createdAt",
          "santriId",
        ],
      });

      const formattedData = recentTransactions.map((tx) => ({
        id: tx.id,
        type: tx.payment_method === "TopUp" ? "TopUp" : "Purchase",
        customer_name: tx.santri ? tx.santri.nama_santri : "Umum/Tunai",
        amount: tx.total_amount,
        createdAt: tx.createdAt,
      }));

      return h.response({ success: true, data: formattedData }).code(200);
    } catch (error) {
      console.error("Error getting recent activity:", error);
      return Boom.internal("Gagal mengambil aktivitas terkini.");
    }
  },

  /**
   * 10. Mendapatkan Pola Transaksi Per Jam
   */
  getHourlyTransactionPattern: async (request, h) => {
    try {
      const {
        period,
        startDate: reqStartDate,
        endDate: reqEndDate,
      } = request.query;
      const whereClause = { payment_method: { [Op.ne]: "TopUp" } };

      if (period) {
        const range = getDateRange(period);
        if (!range) return Boom.badRequest("Periode tidak valid.");
        whereClause.createdAt = {
          [Op.between]: [range.startDate, range.endDate],
        };
      } else if (reqStartDate && reqEndDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(reqStartDate), new Date(reqEndDate)],
        };
      }

      const hourlyData = await Transaksi.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn("HOUR", sequelize.col("createdAt")), "hour"],
          [sequelize.fn("COUNT", sequelize.col("id")), "transactions"],
        ],
        group: [sequelize.fn("HOUR", sequelize.col("createdAt"))],
        order: [[sequelize.fn("HOUR", sequelize.col("createdAt")), "ASC"]],
        raw: true,
      });

      const fullDayPattern = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        transactions: 0,
      }));

      hourlyData.forEach((data) => {
        const hourIndex = parseInt(data.hour, 10);
        if (hourIndex >= 0 && hourIndex < 24) {
          fullDayPattern[hourIndex].transactions = parseInt(
            data.transactions,
            10
          );
        }
      });

      return h.response({ success: true, data: fullDayPattern }).code(200);
    } catch (error) {
      console.error("Error getting hourly transaction pattern:", error);
      return Boom.internal("Gagal mengambil pola transaksi per jam.");
    }
  },
  /**
   * FUNGSI BARU: Ekspor Laporan Lengkap ke Excel
   */
  exportFullReportExcel: async (request, h) => {
    try {
      const { period = "all" } = request.query;
      const { startDate, endDate } = getDateRange(period);
      const whereClause =
        startDate && endDate
          ? { createdAt: { [Op.between]: [startDate, endDate] } }
          : {};

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "WebApp Koperasi";
      workbook.created = new Date();

      // --- 1. Worksheet: Balance Santri ---
      const santriSheet = workbook.addWorksheet("Balance Santri");
      const allSantri = await Santri.findAll({
        include: [{ model: Balance, as: "balance" }],
        order: [["nama_santri", "ASC"]],
      });

      const balances = allSantri
        .map((s) => s.balance?.amount || 0)
        .filter((b) => b !== null);
      const totalSantri = allSantri.length;
      const totalBalance = balances.reduce((sum, b) => sum + b, 0);
      const avgBalance = totalSantri > 0 ? totalBalance / totalSantri : 0;
      const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;
      const minBalance = balances.length > 0 ? Math.min(...balances) : 0;

      santriSheet.addRow(["Total Santri", totalSantri]);
      santriSheet.addRow(["Total Balance Semua Santri", totalBalance]);
      santriSheet.addRow(["Rata-rata Balance", avgBalance]);
      santriSheet.addRow(["Balance Tertinggi", maxBalance]);
      santriSheet.addRow(["Balance Terendah", minBalance]);
      santriSheet.addRow([]);
      const detailTitleRow = santriSheet.addRow(["Detail Balance per Santri"]);
      detailTitleRow.font = { bold: true };

      const detailHeaderRow = santriSheet.addRow([
        "ID Santri",
        "Nama Santri",
        "Balance (Rp)",
      ]);
      detailHeaderRow.font = { bold: true };

      allSantri.forEach((santri) => {
        santriSheet.addRow([
          santri.id_santri,
          santri.nama_santri,
          santri.balance?.amount || 0,
        ]);
      });

      santriSheet.getColumn(1).width = 30;
      santriSheet.getColumn(2).width = 30;
      santriSheet.getColumn(3).width = 20;
      santriSheet.getColumn(3).numFmt = "#,##0";

      // --- 2. Worksheet: Laporan Produk ---
      const productSheet = workbook.addWorksheet("Laporan Produk");
      const products = await Transaction_detail.findAll({
        attributes: [
          "productId",
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantitySold"],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "`Transaction_detail`.`quantity` * `Transaction_detail`.`price`"
              )
            ),
            "totalRevenue",
          ],
        ],
        include: [
          {
            model: Transaksi,
            as: "transaction",
            where: whereClause,
            attributes: [],
          },
          {
            model: Produk,
            as: "product",
            attributes: ["name", "price", "stock"],
          },
        ],
        group: ["productId", "product.id"],
      });

      const top5SellingProducts = [...products]
        .sort(
          (a, b) =>
            (b.dataValues.totalQuantitySold || 0) -
            (a.dataValues.totalQuantitySold || 0)
        )
        .slice(0, 5);

      const top5RevenueProducts = [...products]
        .sort(
          (a, b) =>
            (b.dataValues.totalRevenue || 0) - (a.dataValues.totalRevenue || 0)
        )
        .slice(0, 5);

      const topSellingTitle = productSheet.addRow([
        "Top 5 Produk Terlaris (berdasarkan unit terjual)",
      ]);
      topSellingTitle.font = { bold: true };
      top5SellingProducts.forEach((p, index) => {
        const sold = parseInt(p.dataValues.totalQuantitySold, 10) || 0;
        productSheet.addRow([
          `${index + 1}. ${p.product.name}`,
          `${sold} unit`,
        ]);
      });
      productSheet.addRow([]);

      const topRevenueTitle = productSheet.addRow([
        "Top 5 Produk Pendapatan Tertinggi",
      ]);
      topRevenueTitle.font = { bold: true };
      top5RevenueProducts.forEach((p, index) => {
        const revenue = parseInt(p.dataValues.totalRevenue, 10) || 0;
        productSheet.addRow([
          `${index + 1}. ${p.product.name}`,
          `Rp ${revenue.toLocaleString("id-ID")}`,
        ]);
      });
      productSheet.addRow([]);

      const productTitleRow = productSheet.addRow([
        "Detail Penjualan Semua Produk",
      ]);
      productTitleRow.font = { bold: true };

      const productHeaderRow = productSheet.addRow([
        "Nama Produk",
        "Harga Satuan (Rp)",
        "Sisa Stok",
        "Jumlah Terjual",
        "Total Pendapatan (Rp)",
      ]);
      productHeaderRow.font = { bold: true };

      products.forEach((p) => {
        productSheet.addRow([
          p.product.name,
          p.product.price,
          p.product.stock,
          parseInt(p.dataValues.totalQuantitySold, 10) || 0,
          parseInt(p.dataValues.totalRevenue, 10) || 0,
        ]);
      });

      productSheet.getColumn(1).width = 40;
      productSheet.getColumn(2).width = 20;
      productSheet.getColumn(2).numFmt = "#,##0";
      productSheet.getColumn(3).width = 15;
      productSheet.getColumn(4).width = 15;
      productSheet.getColumn(5).width = 25;
      productSheet.getColumn(5).numFmt = "#,##0";

      // --- 3. Worksheet: Laporan Kategori ---
      const categorySheet = workbook.addWorksheet("Laporan Kategori");
      const categories = await Transaction_detail.findAll({
        attributes: [
          [sequelize.col("product.category.name"), "categoryName"],
          [
            sequelize.fn("COUNT", sequelize.col("transactionId")),
            "transactionCount",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.fn("DISTINCT", sequelize.col("productId"))
            ),
            "uniqueProducts",
          ],
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalItemsSold"],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "`Transaction_detail`.`quantity` * `Transaction_detail`.`price`"
              )
            ),
            "totalRevenue",
          ],
        ],
        include: [
          {
            model: Transaksi,
            as: "transaction",
            where: whereClause,
            attributes: [],
          },
          {
            model: Produk,
            as: "product",
            attributes: [],
            include: [{ model: Category, as: "category", attributes: [] }],
          },
        ],
        group: ["product.category.name"],
        raw: true,
      });

      // --- PERBAIKAN DI SINI ---
      const top5SellingCategories = [...categories]
        .sort((a, b) => (b.totalItemsSold || 0) - (a.totalItemsSold || 0))
        .slice(0, 5);

      const top5RevenueCategories = [...categories]
        .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
        .slice(0, 5);

      const topSellingCatTitle = categorySheet.addRow([
        "Top 5 Kategori Terlaris (berdasarkan unit terjual)",
      ]);
      topSellingCatTitle.font = { bold: true };
      top5SellingCategories.forEach((c, index) => {
        const sold = parseInt(c.totalItemsSold, 10) || 0;
        categorySheet.addRow([
          `${index + 1}. ${c.categoryName}`,
          `${sold} unit`,
        ]);
      });
      categorySheet.addRow([]);

      const topRevenueCatTitle = categorySheet.addRow([
        "Top 5 Kategori Pendapatan Tertinggi",
      ]);
      topRevenueCatTitle.font = { bold: true };
      top5RevenueCategories.forEach((c, index) => {
        const revenue = parseInt(c.totalRevenue, 10) || 0;
        categorySheet.addRow([
          `${index + 1}. ${c.categoryName}`,
          `Rp ${revenue.toLocaleString("id-ID")}`,
        ]);
      });
      categorySheet.addRow([]);

      const categoryTitleRow = categorySheet.addRow(["Detail Semua Kategori"]);
      categoryTitleRow.font = { bold: true };

      const categoryHeaderRow = categorySheet.addRow([
        "Nama Kategori",
        "Jml Transaksi",
        "Jml Produk Unik",
        "Rata-rata Item/Transaksi",
      ]);
      categoryHeaderRow.font = { bold: true };

      categories.forEach((c) => {
        const txCount = parseInt(c.transactionCount, 10) || 0;
        const itemsSold = parseInt(c.totalItemsSold, 10) || 0;
        categorySheet.addRow([
          c.categoryName,
          txCount,
          parseInt(c.uniqueProducts, 10) || 0,
          txCount > 0 ? (itemsSold / txCount).toFixed(2) : 0,
        ]);
      });

      categorySheet.getColumn(1).width = 40;
      categorySheet.getColumn(2).width = 20;
      categorySheet.getColumn(3).width = 20;
      categorySheet.getColumn(4).width = 25;

      // --- 4. Worksheet: Laporan Transaksi ---
      const transactionSheet = workbook.addWorksheet("Laporan Transaksi");
      const transactions = await Transaksi.findAll({
        where: whereClause,
        include: [
          { model: Santri, as: "santri", attributes: ["nama_santri"] },
          { model: Admin, as: "kasir", attributes: ["username"] },
        ],
        order: [["createdAt", "DESC"]],
      });

      const totalTx = transactions.length;
      const totalPurchaseAmount = transactions
        .filter((t) => t.payment_method !== "TopUp")
        .reduce((sum, t) => sum + t.total_amount, 0);
      const purchaseTxCount = transactions.filter(
        (t) => t.payment_method !== "TopUp"
      ).length;
      const avgPurchase =
        purchaseTxCount > 0 ? totalPurchaseAmount / purchaseTxCount : 0;

      transactionSheet.addRow(["Total Transaksi (termasuk TopUp)", totalTx]);
      transactionSheet.addRow([
        "Total Pembelian (non-TopUp)",
        totalPurchaseAmount,
      ]);
      transactionSheet.addRow(["Rata-rata Pembelian", avgPurchase]);
      transactionSheet.addRow([]);
      const transactionTitleRow = transactionSheet.addRow(["Detail Transaksi"]);
      transactionTitleRow.font = { bold: true };

      const transactionHeaderRow = transactionSheet.addRow([
        "ID Transaksi",
        "Customer/Kasir",
        "Metode Pembayaran",
        "Total (Rp)",
        "Tanggal",
      ]);
      transactionHeaderRow.font = { bold: true };

      transactions.forEach((t) => {
        transactionSheet.addRow([
          t.id,
          t.santri?.nama_santri || t.kasir?.username || "N/A",
          t.payment_method,
          t.total_amount,
          t.createdAt,
        ]);
      });

      transactionSheet.getColumn(1).width = 15;
      transactionSheet.getColumn(2).width = 30;
      transactionSheet.getColumn(3).width = 20;
      transactionSheet.getColumn(4).width = 20;
      transactionSheet.getColumn(4).numFmt = "#,##0";
      transactionSheet.getColumn(5).width = 25;

      const buffer = await workbook.xlsx.writeBuffer();

      return h
        .response(buffer)
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        .header(
          "Content-Disposition",
          `attachment; filename="laporan-lengkap-${period}.xlsx"`
        );
    } catch (error) {
      console.error("Error exporting Excel report:", error);
      return Boom.internal("Gagal membuat laporan Excel.");
    }
  },
};

module.exports = reportController;
