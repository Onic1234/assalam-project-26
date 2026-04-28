const categoryController = require("../controllers/categoryController");
const Joi = require("joi");

const categoryRoutes = [
  {
    method: "POST",
    path: "/categories",
    handler: categoryController.createCategory,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        payload: Joi.object({
          // CORRECTED: from 'Nama' to 'name'
          name: Joi.string().trim().min(1).max(255).required().messages({
            "string.empty": "Nama kategori tidak boleh kosong",
            "string.min": "Nama kategori minimal 1 karakter",
            "string.max": "Nama kategori maksimal 255 karakter",
            "any.required": "Nama kategori wajib diisi",
          }),
        }),
      },
    },
  },
  {
    method: "PUT",
    path: "/categories/{id}",
    handler: categoryController.updateCategory,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
        payload: Joi.object({
          // CORRECTED: from 'Nama' to 'name'
          name: Joi.string().trim().min(1).max(255).required().messages({
            "string.empty": "Nama kategori tidak boleh kosong",
            "string.min": "Nama kategori minimal 1 karakter",
            "string.max": "Nama kategori maksimal 255 karakter",
            "any.required": "Nama kategori wajib diisi",
          }),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/categories/{id}",
    handler: categoryController.getCategoryById,
    options: {
      auth: false,
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
        query: Joi.object({
          includeProducts: Joi.string().valid("true", "false").optional(),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/categories",
    handler: categoryController.getAllCategories,
    options: {
      auth: false,
      validate: {
        query: Joi.object({
          page: Joi.number().integer().min(1).optional(),
          limit: Joi.number().integer().min(1).max(100).optional(),
          search: Joi.string().allow("").optional(), // Allow empty string
          includeProducts: Joi.string().valid("true", "false").optional(),
          sortBy: Joi.string()
            // CORRECTED: from 'Nama' to 'name'
            .valid("id", "name", "createdAt", "updatedAt")
            .optional(),
          sortOrder: Joi.string().valid("ASC", "DESC").optional(),
        }),
      },
    },
  },
  // ... (other routes remain the same)
  {
    method: "DELETE",
    path: "/categories/{id}",
    handler: categoryController.deleteCategory,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
        query: Joi.object({
          force: Joi.string().valid("true", "false").optional(),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/categories/product-count",
    handler: categoryController.getCategoriesWithProductCount,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        query: Joi.object({
          search: Joi.string().allow("").optional(),
        }),
      },
    },
  },
  {
    method: "POST",
    path: "/categories/bulk-delete",
    handler: categoryController.bulkDeleteCategories,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        payload: Joi.object({
          categoryIds: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required()
            .messages({
              "array.min": "Minimal harus ada 1 kategori yang dipilih",
              "any.required": "categoryIds wajib diisi",
            }),
        }),
        query: Joi.object({
          force: Joi.string().valid("true", "false").optional(),
        }),
      },
    },
  },
];

module.exports = categoryRoutes;
