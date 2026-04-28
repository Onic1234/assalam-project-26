// routes/ticketingRoutes.js
const { fa } = require("@faker-js/faker");
const ticketingController = require("../controllers/ticketingController");
const ticketPriceController = require("../controllers/ticketPriceController");
const Joi = require("joi");

// Skema validasi untuk payload Face Descriptor
const faceDescriptorValidation = {
  auth: false, // <-- Tambahkan ini untuk membuat rute menjadi publik
  description: "Ticketing endpoint for Face Descriptor based tickets",
  validate: {
    payload: Joi.object({
      faceDescriptor: Joi.array().items(Joi.number()).length(128).required(),
    }),
  },
};

const routes = [
  // Endpoint Proses Pembelian Tiket
  {
    method: "POST",
    path: "/ticketing/reguler",
    handler: ticketingController.ticketForReguler,
    options: {
      auth: false, // <-- Tambahkan ini untuk membuat rute menjadi publik
      description: "Ticketing endpoint for regular ticket purchases",
    },
  },
  {
    method: "POST",
    path: "/ticketing/staff",
    handler: ticketingController.ticketForStaff,
    options: {
      auth: false, // <-- Tambahkan ini untuk membuat rute menjadi publik
      description: "Ticketing endpoint for staff ticket purchases",
    },
  },

  // --- RUTE-RUTE INI DIPERBARUI ---
  {
    method: "POST",
    path: "/ticketing/ppmi",
    handler: ticketingController.ticketForPPMI,
    options: faceDescriptorValidation,
  },
  {
    method: "POST",
    path: "/ticketing/santri",
    handler: ticketingController.ticketForSantri,
    options: faceDescriptorValidation,
  },
  {
    method: "POST",
    path: "/ticketing/member",
    handler: ticketingController.ticketForMember,
    options: faceDescriptorValidation,
  },

  // Endpoint Manajemen Harga Tiket
  {
    method: "GET",
    path: "/ticketing/prices",
    handler: ticketPriceController.getTicketPrices,
    options: { auth: false },
  },
  {
    method: "POST",
    path: "/ticketing/prices",
    handler: ticketPriceController.setTicketPrice,
    options: { auth: { scope: ["admin"] } },
  },
  // Endpoint untuk melihat laporan penjualan tiket (Hanya Admin)
  {
    method: "GET",
    path: "/ticketing/sales",
    handler: ticketingController.getAllTicketSales,
    options: {
      auth: {
        scope: ["admin"], // Hanya admin yang bisa melihat laporan penjualan
      },
      validate: {
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).default(10),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/ticketing/export",
    handler: ticketingController.exportSalesToExcel,
    options: {
      auth: {
        scope: ["admin"], // Hanya admin yang bisa mengekspor
      },
      description: "Exports all ticket sales to an Excel file.",
    },
  },
];

module.exports = routes;
