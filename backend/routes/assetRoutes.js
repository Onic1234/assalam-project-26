// routes/assetRoutes.js
const assetController = require("../controllers/assetController");
const Joi = require("joi");

const assetRoutes = [
  {
    method: "GET",
    path: "/assets",
    handler: assetController.getAllAssets,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        query: Joi.object({
          search: Joi.string().allow("").optional(),
          lokasi: Joi.string().allow("").optional(),
          kategori: Joi.string().allow("").optional(),
          tahun_perolehan: Joi.string().allow("").optional(),
          bulan_maintenance: Joi.string().allow("").optional(),
          status_maintenance: Joi.string().allow("").optional(),
          page: Joi.number().integer().min(1).default(1).optional(),
          limit: Joi.number().integer().min(1).default(10).optional(),
        }),
      },
      description: "Get all assets with filtering and pagination",
    },
  },
  {
    method: "GET",
    path: "/assets/stats",
    handler: assetController.getAssetStats,
    options: {
      auth: { scope: ["admin", "kasir"] },
      description: "Get asset analytics and statistics for the dashboard",
    },
  },
  {
    method: "GET",
    path: "/assets/{id}",
    handler: assetController.getAssetById,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
      description: "Get asset details by ID",
    },
  },
  {
    method: "PUT",
    path: "/assets/{id}",
    handler: assetController.updateAsset,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
        payload: Joi.object({
          kode: Joi.string().optional(),
          nama: Joi.string().optional(),
          kategori: Joi.string().optional(),
          lokasi: Joi.string().optional(),
          coa: Joi.string().allow("").allow(null).optional(),
          merk_type: Joi.string().allow("").allow(null).optional(),
          vendor: Joi.string().allow("").allow(null).optional(),
          tahun_perolehan: Joi.number().integer().allow(null).optional(),
          harga_perolehan: Joi.number().allow(null).optional(),
          umur_aktiva: Joi.number().integer().allow(null).optional(),
          periode_maintenance: Joi.string().allow("").allow(null).optional(),
          status_maintenance: Joi.string().valid("No Maintenance", "Scheduled", "Pending", "Done", "Overdue").optional(),
          scheduled_months: Joi.array().items(Joi.string()).optional(),
          schedule_details: Joi.object().optional(),
        }),
      },
      description: "Update asset by ID",
    },
  },
  {
    method: "DELETE",
    path: "/assets/{id}",
    handler: assetController.deleteAsset,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
      description: "Delete asset by ID",
    },
  },
];

module.exports = assetRoutes;
