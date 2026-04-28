// routes/productRoutes.js
const Joi = require("joi");
const produkController = require("../controllers/productController");
const { auth } = require("../middleware/auth");

const productRoutes = [
  // 1. Create Product
  {
    method: "POST",
    path: "/products",
    handler: produkController.createProduct,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        payload: Joi.object({
          name: Joi.string().min(1).max(255).required().messages({
            "string.empty": "Nama produk tidak boleh kosong",
            "any.required": "Nama produk wajib diisi",
            "string.max": "Nama produk maksimal 255 karakter",
          }),
          price: Joi.number().positive().required().messages({
            "number.positive": "Harga harus bernilai positif",
            "any.required": "Harga wajib diisi",
          }),
          stock: Joi.number().integer().min(0).default(0).messages({
            "number.min": "Stok tidak boleh negatif",
            "number.integer": "Stok harus berupa bilangan bulat",
          }),
          categoryId: Joi.number()
            .integer()
            .positive()
            .allow(null)
            .optional()
            .messages({
              "number.positive": "Category ID harus bernilai positif",
              "number.integer": "Category ID harus berupa bilangan bulat",
            }),
        }),
      },
      description: "Membuat produk baru",
      tags: ["api", "products"],
    },
  },

  // 2. Update Product
  {
    method: ["PUT", "PATCH"],
    path: "/products/{id}",
    handler: produkController.updateProduct,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
        payload: Joi.object({
          name: Joi.string().min(1).max(255).optional(),
          price: Joi.number().positive().optional(),
          stock: Joi.number().integer().min(0).optional(),
          categoryId: Joi.number().integer().positive().allow(null).optional(),
        })
          .min(1)
          .messages({
            "object.min": "Setidaknya satu field harus diisi untuk update",
          }),
      },
      description: "Memperbarui produk berdasarkan ID",
      tags: ["api", "products"],
    },
  },

  // 3. Get Product By ID atau Name (flexible)
  {
    method: "GET",
    path: "/products/{identifier}",
    handler: produkController.getProduct,
    options: {
      auth: false,
      description: "Mendapatkan produk berdasarkan ID atau nama",
      tags: ["api", "products"],
    },
  },

  // NEW: Batch Get Products By Names
  {
    method: "POST",
    path: "/products/batch",
    handler: produkController.getProductsByNames,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        payload: Joi.object({
          products: Joi.object()
            .pattern(Joi.string(), Joi.number().integer().positive())
            .required(),
        }),
        query: Joi.object({
          exactMatch: Joi.boolean().default(true),
        }),
      },
      description: "Mendapatkan multiple produk berdasarkan nama (batch)",
      tags: ["api", "products"],
    },
  },

  // 4. Get All Products
  {
    method: "GET",
    path: "/products",
    handler: produkController.getAllProducts,
    options: {
      auth: false,
      description: "Mendapatkan semua produk dengan filter dan paginasi",
      tags: ["api", "products"],
    },
  },

  // 5. Delete Product
  {
    method: "DELETE",
    path: "/products/{id}",
    handler: produkController.deleteProduct,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
        query: Joi.object({
          force: Joi.boolean().default(false),
        }),
      },
      description: "Menghapus produk berdasarkan ID",
      tags: ["api", "products"],
    },
  },

  // 6. Update Stock
  {
    method: ["PUT", "PATCH"],
    path: "/products/{identifier}/stock",
    handler: produkController.updateStock,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        params: Joi.object({
          identifier: Joi.alternatives()
            .try(
              Joi.number().integer().positive(),
              Joi.string().min(1).max(255)
            )
            .required(),
        }),
        payload: Joi.object({
          amount: Joi.number().integer().positive().required(),
          type: Joi.string().valid("add", "subtract").required(),
        }),
      },
      description: "Update stok produk (tambah/kurang)",
      tags: ["api", "products"],
    },
  },

  // 7. Get Low Stock Products
  {
    method: "GET",
    path: "/products/low-stock",
    handler: produkController.getLowStockProducts,
    options: {
      auth: { scope: ["admin", "kasir"] },
      description: "Mendapatkan produk dengan stok rendah",
      tags: ["api", "products"],
    },
  },

  // 8. Bulk Update Products
  {
    method: ["PUT", "PATCH"],
    path: "/products/bulk-update",
    handler: produkController.bulkUpdateProducts,
    options: {
      auth: { scope: ["admin", "kasir"] },
      validate: {
        payload: Joi.object({
          products: Joi.array()
            .items(
              Joi.object({
                id: Joi.number().integer().positive().required(),
                updates: Joi.object({
                  name: Joi.string().min(1).max(255).optional(),
                  price: Joi.number().positive().optional(),
                  stock: Joi.number().integer().min(0).optional(),
                  categoryId: Joi.number()
                    .integer()
                    .positive()
                    .allow(null)
                    .optional(),
                })
                  .min(1)
                  .required(),
              })
            )
            .min(1)
            .required(),
        }),
      },
      description: "Update multiple produk sekaligus",
      tags: ["api", "products"],
    },
  },
];

module.exports = productRoutes;
