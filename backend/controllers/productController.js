// controllers/productController.js
const {
  Produk,
  Category,
  Transaction_detail,
  Transaksi,
} = require("../models");
const { Op } = require("sequelize");
const Boom = require("@hapi/boom");

// Helper function untuk response format
const sendResponse = (h, status, success, message, data = null) => {
  return h.response({ success, message, data }).code(status);
};

const produkController = {
  // 1. Create Product
  createProduct: async (request, h) => {
    try {
      const { name, price, stock, categoryId } = request.payload;

      if (categoryId) {
        const category = await Category.findByPk(categoryId);
        if (!category) throw Boom.notFound("Kategori tidak ditemukan");
      }

      const existingProduct = await Produk.findOne({
        where: { name: { [Op.like]: name.trim() } },
      });
      if (existingProduct)
        throw Boom.conflict("Produk dengan nama tersebut sudah ada");

      const newProduct = await Produk.create({
        name: name.trim(),
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        categoryId: categoryId || null,
      });

      const productWithCategory = await Produk.findByPk(newProduct.id, {
        include: [
          // FIX: 'Nama' diubah menjadi 'name'
          { model: Category, as: "category", attributes: ["id", "name"] },
        ],
      });

      return sendResponse(
        h,
        201,
        true,
        "Produk berhasil dibuat",
        productWithCategory
      );
    } catch (error) {
      console.error("Error in createProduct:", error);
      if (error.isBoom) throw error;
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },

  // 2. Update Product
  updateProduct: async (request, h) => {
    try {
      const { id } = request.params;
      const { name, price, stock, categoryId } = request.payload;

      const product = await Produk.findByPk(id);
      if (!product) throw Boom.notFound("Produk tidak ditemukan");

      if (categoryId && categoryId !== product.categoryId) {
        const category = await Category.findByPk(categoryId);
        if (!category) throw Boom.notFound("Kategori tidak ditemukan");
      }

      if (name && name.trim().toLowerCase() !== product.name.toLowerCase()) {
        const existingProduct = await Produk.findOne({
          where: { name: { [Op.like]: name.trim() }, id: { [Op.ne]: id } },
        });
        if (existingProduct)
          throw Boom.conflict("Produk dengan nama tersebut sudah ada");
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (price !== undefined) updateData.price = parseFloat(price);
      if (stock !== undefined) updateData.stock = parseInt(stock);
      if (categoryId !== undefined) updateData.categoryId = categoryId || null;

      await product.update(updateData);

      const updatedProduct = await Produk.findByPk(id, {
        include: [
          // FIX: 'Nama' diubah menjadi 'name'
          { model: Category, as: "category", attributes: ["id", "name"] },
        ],
      });

      return sendResponse(
        h,
        200,
        true,
        "Produk berhasil diperbarui",
        updatedProduct
      );
    } catch (error) {
      console.error("Error in updateProduct:", error);
      if (error.isBoom) throw error;
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },

  // 3. Get Product By ID atau Name
  getProduct: async (request, h) => {
    try {
      const { identifier } = request.params;
      const { includeTransactions = false } = request.query;

      let includeOptions = [
        // <-- 'include' untuk kategori didefinisikan secara langsung
        { model: Category, as: "category", attributes: ["id", "name"] },
      ];

      if (includeTransactions === "true") {
        includeOptions.push({
          model: Transaction_detail,
          as: "transaction_details",
          attributes: ["id", "Transaction_id", "amount", "createdAt"],
          include: [
            {
              model: Transaksi,
              as: "transaction",
              attributes: [
                "id",
                "Transaction_type",
                "total_amount",
                "createdAt",
              ],
            },
          ],
        });
      }

      let product;
      if (!isNaN(identifier)) {
        product = await Produk.findByPk(identifier, {
          include: includeOptions, // <-- Selalu menyertakan kategori
        });
      }

      if (!product) {
        product = await Produk.findOne({
          where: { name: { [Op.like]: identifier.trim() } },
          include: includeOptions,
        });
      }

      if (!product) throw Boom.notFound("Produk tidak ditemukan");

      return sendResponse(
        h,
        200,
        true,
        "Data produk berhasil diambil",
        product
      );
    } catch (error) {
      console.error("Error in getProduct:", error);
      if (error.isBoom) throw error;
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },

  // NEW: Batch Get Products By Names
  getProductsByNames: async (request, h) => {
    try {
      const { products } = request.payload;
      const { exactMatch = true } = request.query;

      const productNames = Object.keys(products);
      const results = {};
      const notFound = [];

      for (const productName of productNames) {
        try {
          const whereCondition =
            exactMatch === "true"
              ? { name: productName.trim() }
              : { name: { [Op.like]: `%${productName.trim()}%` } };

          const product = await Produk.findOne({
            where: whereCondition,
            include: [
              // FIX: 'Nama' diubah menjadi 'name'
              { model: Category, as: "category", attributes: ["id", "name"] },
            ],
          });

          if (product) {
            results[productName] = {
              ...product.toJSON(),
              requestedQuantity: products[productName],
              available: product.stock >= products[productName],
            };
          } else {
            notFound.push(productName);
          }
        } catch (error) {
          console.error(`Error processing product ${productName}:`, error);
          notFound.push(productName);
        }
      }

      return sendResponse(h, 200, true, "Pencarian produk selesai", {
        found: results,
        notFound,
        summary: {
          totalRequested: productNames.length,
          found: Object.keys(results).length,
          notFound: notFound.length,
        },
      });
    } catch (error) {
      console.error("Error in getProductsByNames:", error);
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },

  // 4. Get All Products
  getAllProducts: async (request, h) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        categoryId = "",
        minPrice = "",
        maxPrice = "",
        minStock = "",
        maxStock = "",
        sortBy = "createdAt",
        sortOrder = "DESC",
        includeCategory = "true",
      } = request.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (search) whereClause.name = { [Op.like]: `%${search}%` };
      if (categoryId) whereClause.categoryId = parseInt(categoryId);

      if (minPrice || maxPrice) {
        whereClause.price = {};
        if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
        if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
      }
      if (minStock || maxStock) {
        whereClause.stock = {};
        if (minStock) whereClause.stock[Op.gte] = parseInt(minStock);
        if (maxStock) whereClause.stock[Op.lte] = parseInt(maxStock);
      }

      let includeOptions = [];
      if (includeCategory === "true") {
        includeOptions.push({
          model: Category,
          as: "category",
          // FIX: 'Nama' diubah menjadi 'name'
          attributes: ["id", "name"],
        });
      }

      const { count, rows } = await Produk.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder]],
      });

      return sendResponse(h, 200, true, "Data produk berhasil diambil", {
        products: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Error in getAllProducts:", error);
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },

  // 5. Delete Product
  deleteProduct: async (request, h) => {
    try {
      const { id } = request.params;
      const { force = false } = request.query;

      const product = await Produk.findByPk(id);
      if (!product) throw Boom.notFound("Produk tidak ditemukan");

      const transactionCount = await Transaction_detail.count({
        where: { productId: id },
      });
      if (transactionCount > 0 && force !== "true") {
        throw Boom.badRequest(
          `Produk tidak dapat dihapus karena terkait dengan ${transactionCount} transaksi. Gunakan ?force=true untuk menghapus paksa.`
        );
      }

      if (transactionCount > 0 && force === "true") {
        await Transaction_detail.update(
          { productId: null },
          { where: { productId: id } }
        );
      }

      await product.destroy();
      return sendResponse(h, 200, true, "Produk berhasil dihapus");
    } catch (error) {
      console.error("Error in deleteProduct:", error);
      if (error.isBoom) throw error;
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },

  // 6. Update Stock
  updateStock: async (request, h) => {
    try {
      const { identifier } = request.params;
      const { amount, type } = request.payload;

      let product;
      if (!isNaN(identifier)) {
        product = await Produk.findByPk(identifier);
      }
      if (!product) {
        product = await Produk.findOne({
          where: { name: { [Op.like]: identifier.trim() } },
        });
      }
      if (!product) throw Boom.notFound("Produk tidak ditemukan");

      let newStock = product.stock;
      if (type === "add") {
        newStock += parseInt(amount);
      } else if (type === "subtract") {
        newStock -= parseInt(amount);
        if (newStock < 0) throw Boom.badRequest("Stok tidak mencukupi");
      }

      await product.update({ stock: newStock });
      const updatedProduct = await Produk.findByPk(product.id, {
        include: [
          // FIX: 'Nama' diubah menjadi 'name'
          { model: Category, as: "category", attributes: ["id", "name"] },
        ],
      });

      return sendResponse(
        h,
        200,
        true,
        "Stok berhasil diperbarui",
        updatedProduct
      );
    } catch (error) {
      console.error("Error in updateStock:", error);
      if (error.isBoom) throw error;
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },

  // 7. Get Low Stock Products
  getLowStockProducts: async (request, h) => {
    try {
      const { threshold = 10, includeCategory = true } = request.query;

      const lowStockProducts = await Produk.findAll({
        where: { stock: { [Op.lte]: parseInt(threshold) } },
        include:
          includeCategory === "true"
            ? // FIX: 'Nama' diubah menjadi 'name'
              [{ model: Category, as: "category", attributes: ["id", "name"] }]
            : [],
        order: [["stock", "ASC"]],
      });

      return sendResponse(
        h,
        200,
        true,
        `Produk dengan stok <= ${threshold}`,
        lowStockProducts
      );
    } catch (error) {
      console.error("Error in getLowStockProducts:", error);
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },

  // 8. Bulk Update Products
  bulkUpdateProducts: async (request, h) => {
    try {
      const { products } = request.payload;
      const results = [];
      const errors_bulk = [];

      for (const item of products) {
        try {
          const { id, updates } = item;
          const product = await Produk.findByPk(id);
          if (!product) {
            errors_bulk.push({ id, error: "Produk tidak ditemukan" });
            continue;
          }
          await product.update(updates);
          results.push({ id, status: "updated" });
        } catch (error) {
          errors_bulk.push({ id: item.id, error: error.message });
        }
      }

      return sendResponse(h, 200, true, "Bulk update selesai", {
        successCount: results.length,
        errorCount: errors_bulk.length,
        errors: errors_bulk,
      });
    } catch (error) {
      console.error("Error in bulkUpdateProducts:", error);
      throw Boom.internal("Terjadi kesalahan server", error.message);
    }
  },
};

module.exports = produkController;
