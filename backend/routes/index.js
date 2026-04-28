// routes/index.js

// --- Rute yang sudah ada ---
const categoryRoutes = require("./categoryRoutes");
const productRoutes = require("./productRoutes");
const transactionRoutes = require("./transactionRoutes");
const reportRoutes = require("./reportRoutes");
const predictRoutes = require("./predictRoutes");

// --- Rute yang telah kita sesuaikan/buat ---
const authRoutes = require("./authRoutes"); // Sudah disesuaikan
const importSantriRoutes = require("./importSantriRoutes"); // Sudah disesuaikan
const importRoutes = require("./importRoutes");
const topupRoutes = require("./topupRoutes"); // ← TAMBAHAN INI YANG PENTING!

// --- Rute baru untuk Ticketing ---
const customerRoutes = require("./customerRoutes"); // Rute baru
const ticketingRoutes = require("./ticketingRoutes"); // Rute baru

// --- Rute baru untuk Setting ---
const settingRoutes = require("./settingRoutes"); // Rute baru untuk pengaturan QRIS

// Menggabungkan semua rute ke dalam satu array
const routes = [
  // Rute yang sudah ada
  ...categoryRoutes,
  ...productRoutes,
  ...transactionRoutes,
  ...reportRoutes,
  ...predictRoutes,

  // Rute yang disesuaikan dan rute baru
  ...authRoutes,
  ...importSantriRoutes,
  ...importRoutes,
  ...topupRoutes, // ← DAN TAMBAHAN INI!
  ...customerRoutes,
  ...ticketingRoutes,
  ...settingRoutes, // Rute baru untuk pengaturan QRIS
];

module.exports = routes;
