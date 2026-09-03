// routes/index.js

// --- Rute yang sudah ada ---
const categoryRoutes = require("./categoryRoutes");
const productRoutes = require("./productRoutes");
const transactionRoutes = require("./transactionRoutes");
const reportRoutes = require("./reportRoutes");
const predictRoutes = require("./predictRoutes");

// --- Rute yang telah kita sesuaikan/buat ---
const authRoutes = require("./authRoutes");
const importSantriRoutes = require("./importSantriRoutes");
const importRoutes = require("./importRoutes");
const topupRoutes = require("./topupRoutes");

// --- Rute baru untuk Ticketing ---
const customerRoutes = require("./customerRoutes");
const ticketingRoutes = require("./ticketingRoutes");

// --- Rute baru untuk Setting ---
const settingRoutes = require("./settingRoutes");

// --- Rute baru untuk Lost & Found ---
const lostItemRoutes = require("./lostItemRoutes");

// --- Rute baru untuk Aset & Inventaris ---
const assetRoutes = require("./assetRoutes");

// --- Rute baru untuk Bahan Baku & Resep ---
const ingredientRoutes = require("./ingredientRoutes");
const recipeRoutes = require("./recipeRoutes");

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
  ...topupRoutes,
  ...customerRoutes,
  ...ticketingRoutes,
  ...settingRoutes,
  ...lostItemRoutes,
  ...assetRoutes,
  ...ingredientRoutes,
  ...recipeRoutes,
];

module.exports = routes;
