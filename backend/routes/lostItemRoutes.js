// routes/lostItemRoutes.js
const lostItemController = require("../controllers/lostItemController");
const Joi = require("joi");

const payloadConfig = {
  output: "data",
  parse: true,
  allow: ["application/json", "multipart/form-data"],
  multipart: { output: "data" },
  maxBytes: 10 * 1024 * 1024, // 10MB limit
};

const lostItemRoutes = [
  {
    method: "GET",
    path: "/lost-items",
    handler: lostItemController.getAllLostItems,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        query: Joi.object({
          search: Joi.string().allow("").optional(),
          status: Joi.string().valid("Lost", "Claimed").allow("").optional(),
        }),
      },
      description: "Get all lost items with search and status filter",
    },
  },
  {
    method: "GET",
    path: "/lost-items/{id}",
    handler: lostItemController.getLostItemById,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
      description: "Get lost item details by ID",
    },
  },
  {
    method: "POST",
    path: "/lost-items",
    handler: lostItemController.createLostItem,
    options: {
      auth: { scope: ["admin", "kasir"] },
      payload: payloadConfig,
      validate: {
        payload: Joi.object({
          nama_barang: Joi.string().required(),
          deskripsi: Joi.string().allow("").optional(),
          tanggal_ditemukan: Joi.string().required(),
          lokasi_ditemukan: Joi.string().allow("").optional(),
          status: Joi.string().valid("Lost", "Claimed").default("Lost").optional(),
          foto_barang: Joi.any().optional(), // Can be string or file buffer
          nama_pemilik: Joi.string().allow("").optional(),
          nomor_telepon_pemilik: Joi.string().allow("").optional(),
          tanggal_diambil: Joi.string().allow("").optional(),
        }),
      },
      description: "Create a new lost item",
    },
  },
  {
    method: "PUT",
    path: "/lost-items/{id}",
    handler: lostItemController.updateLostItem,
    options: {
      auth: { scope: ["admin", "kasir"] },
      payload: payloadConfig,
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
        payload: Joi.object({
          nama_barang: Joi.string().optional(),
          deskripsi: Joi.string().allow("").optional(),
          tanggal_ditemukan: Joi.string().optional(),
          lokasi_ditemukan: Joi.string().allow("").optional(),
          status: Joi.string().valid("Lost", "Claimed").optional(),
          foto_barang: Joi.any().optional(),
          nama_pemilik: Joi.string().allow("").optional(),
          nomor_telepon_pemilik: Joi.string().allow("").optional(),
          tanggal_diambil: Joi.string().allow("").optional(),
        }),
      },
      description: "Update lost item by ID (claims, edits)",
    },
  },
  {
    method: "DELETE",
    path: "/lost-items/{id}",
    handler: lostItemController.deleteLostItem,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
      description: "Delete lost item by ID",
    },
  },
];

module.exports = lostItemRoutes;
