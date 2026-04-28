// routes/reportRoutes.js
const reportController = require("../controllers/reportController");
const Joi = require("joi");

// Skema validasi dasar untuk filter tanggal
const dateFilterValidation = Joi.object({
  period: Joi.string().valid("daily", "weekly", "monthly", "yearly").optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
})
  .with("startDate", "endDate") // Jika ada startDate, endDate wajib ada
  .with("endDate", "startDate");

const reportRoutes = [
  {
    method: "GET",
    path: "/reports/summary",
    handler: reportController.getTransactionSummary,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        query: dateFilterValidation,
      },
    },
  },
  {
    method: "GET",
    path: "/reports/santri-balances",
    handler: reportController.getAllSantriBalances,
    options: { auth: { scope: ["admin"] } },
  },
  {
    method: "GET",
    path: "/reports/top-products",
    handler: reportController.getTopSellingProducts,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        // Menggabungkan validasi filter tanggal dengan 'limit'
        query: dateFilterValidation.append({
          limit: Joi.number().integer().min(1).default(5),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/reports/popular-categories",
    handler: reportController.getPopularCategories,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        query: dateFilterValidation.append({
          limit: Joi.number().integer().min(1).default(5),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/reports/santri/{santriId}",
    handler: reportController.getIndividualSantriReport,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        params: Joi.object({
          santriId: Joi.number().integer().required(),
        }),
        query: dateFilterValidation,
      },
    },
  },
  {
    method: "GET",
    path: "/reports/export/csv",
    handler: reportController.exportTransactionsCsv,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        query: dateFilterValidation,
      },
    },
  },
  {
    method: "GET",
    path: "/reports/export/excel",
    handler: reportController.exportFullReportExcel,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        query: Joi.object({
          period: Joi.string()
            .valid("daily", "weekly", "monthly", "yearly", "all")
            .default("all"),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/reports/dashboard",
    handler: reportController.getDashboardAnalytics,
    options: { auth: { scope: ["admin"] } },
  },
  {
    method: "GET",
    path: "/reports/recent-activity",
    handler: reportController.getRecentActivity,
    options: { auth: { scope: ["admin"] } },
  },
  {
    method: "GET",
    path: "/reports/daily-graph",
    handler: reportController.getDailyTransactionGraph,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        query: dateFilterValidation,
      },
    },
  },
  {
    method: "GET",
    path: "/reports/hourly-pattern",
    handler: reportController.getHourlyTransactionPattern,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        query: dateFilterValidation,
      },
    },
  },
];

module.exports = reportRoutes;
