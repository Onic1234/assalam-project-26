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
  {
    method: "POST",
    path: "/ticketing/member/scan",
    handler: ticketingController.ticketForMemberById,
    options: {
      auth: false,
      description: "Ticketing endpoint for member scan check-in by custom ID",
      validate: {
        payload: Joi.object({
          id_member: Joi.string().required(),
        }),
      },
    },
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
  {
    method: "PUT",
    path: "/ticketing/sales/{id}",
    handler: ticketingController.updateTicketSale,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
        payload: Joi.object({
          Kuantitas: Joi.number().integer().min(1).optional(),
          Metode_Pembayaran: Joi.string().optional(),
          Tanggal_Kunjungan: Joi.string().optional(),
          Kategori: Joi.string().optional(),
          customerName: Joi.string().optional().allow("", null),
        }),
      },
    },
  },
  {
    method: "DELETE",
    path: "/ticketing/sales/{id}",
    handler: ticketingController.deleteTicketSale,
    options: {
      auth: { scope: ["admin"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
    },
  },
];

module.exports = routes;
