// routes/transactionRoutes.js
const transactionController = require("../controllers/transactionController");
const Joi = require("joi");

const transactionRoutes = [
  // 1. Membuat transaksi Top-Up untuk Santri
  {
    method: "POST",
    path: "/transactions/topup",
    handler: transactionController.createTopupTransaction,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Hanya user terautentikasi (kasir/admin) yang bisa top-up
      validate: {
        payload: Joi.object({
          santriId: Joi.number().integer().required(),
          amount: Joi.number().positive().required(),
        }),
      },
    },
  },

  // 2. Membuat transaksi Pembelian (untuk Santri atau Kasir)
  {
    method: "POST",
    path: "/transactions/purchase",
    handler: transactionController.createPurchaseTransaction,
    options: {
      // Diperbarui: Izinkan akses untuk semua peran yang relevan
      auth: {
        scope: ["admin", "kasir", "santri"],
      },
      validate: {
        payload: Joi.object({
          santriId: Joi.number().integer().optional(), // Tetap opsional
          items: Joi.array()
            .items(
              Joi.object({
                productId: Joi.number().integer().required(),
                quantity: Joi.number().integer().positive().required(),
              })
            )
            .min(1)
            .required(),
          payment_method: Joi.string()
            .valid("Saldo", "Tunai", "QRIS")
            .required(),
        }),
      },
    },
  },

  // 3. Mendapatkan semua transaksi (dengan filter)
  {
    method: "GET",
    path: "/transactions",
    handler: transactionController.getAllTransactions,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Sebaiknya diamankan
      validate: {
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(10),
          startDate: Joi.date().optional(),
          endDate: Joi.date().optional(),
          santriId: Joi.number().integer().optional(),
          kasirId: Joi.number().integer().optional(),
        }),
      },
    },
  },

  // 4. Mendapatkan detail transaksi berdasarkan ID
  {
    method: "GET",
    path: "/transactions/{id}",
    handler: transactionController.getTransactionDetailsById,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Sebaiknya diamankan
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
    },
  },

  // 5. Mendapatkan semua transaksi milik satu santri
  {
    method: "GET",
    path: "/transactions/santri/{santriId}",
    handler: transactionController.getTransactionsBySantri,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Sebaiknya diamankan
      validate: {
        params: Joi.object({
          santriId: Joi.number().integer().required(),
        }),
      },
    },
  },

  // 8. Menghapus transaksi (hanya untuk admin)
  {
    method: "DELETE",
    path: "/transactions/{id}",
    handler: transactionController.deleteTransaction,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Wajib diamankan
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
    },
  },
];

module.exports = transactionRoutes;
