// controllers/categoryController.js
const { Category, Produk } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

// Helper function for response format
const sendResponse = (h, status, success, message, data = null) => {
  return h
    .response({
      success,
      message,
      data,
    })
    .code(status);
};

const categoryController = {
  // 1. Create Category
  createCategory: async (request, h) => {
    try {
      // CORRECTED: Destructuring 'name' instead of 'nama'
      const { name } = request.payload;

      const existingCategory = await Category.findOne({
        where: sequelize.where(
          sequelize.fn('UPPER', sequelize.col('name')),
          // CORRECTED: Using the 'name' variable
          sequelize.fn('UPPER', name.trim())
        ),
      });

      if (existingCategory) {
        return sendResponse(
          h,
          409,
          false,
          'Kategori dengan nama tersebut sudah ada'
        );
      }

      const newCategory = await Category.create({
        // CORRECTED: Using the 'name' variable
        name: name.trim(),
      });

      return sendResponse(
        h,
        201,
        true,
        'Kategori berhasil dibuat',
        newCategory
      );
    } catch (error) {
      console.error('Error in createCategory:', error);
      return sendResponse(
        h,
        500,
        false,
        'Terjadi kesalahan server',
        error.message
      );
    }
  },

  // 2. Update Category
  updateCategory: async (request, h) => {
    try {
      const { id } = request.params;
      // CORRECTED: Destructuring 'name' instead of 'nama'
      const { name } = request.payload;

      const category = await Category.findByPk(id);
      if (!category) {
        return sendResponse(h, 404, false, 'Kategori tidak ditemukan');
      }

      const existingCategory = await Category.findOne({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn('UPPER', sequelize.col('name')),
              // CORRECTED: Using the 'name' variable
              sequelize.fn('UPPER', name.trim())
            ),
            { id: { [Op.ne]: id } },
          ],
        },
      });

      if (existingCategory) {
        return sendResponse(
          h,
          409,
          false,
          'Kategori dengan nama tersebut sudah ada'
        );
      }

      await category.update({
        // CORRECTED: Using the 'name' variable
        name: name.trim(),
      });

      const updatedCategory = await Category.findByPk(id);
      return sendResponse(
        h,
        200,
        true,
        'Kategori berhasil diperbarui',
        updatedCategory
      );
    } catch (error) {
      console.error('Error in updateCategory:', error);
      return sendResponse(
        h,
        500,
        false,
        'Terjadi kesalahan server',
        error.message
      );
    }
  },

  // ... (other functions remain the same as they were already correct or did not use the 'name' field from payload)
  // 3. Get Category By ID
  getCategoryById: async (request, h) => {
    try {
      const { id } = request.params;
      const { includeProducts = 'false' } = request.query;

      let includeOptions = [];
      if (includeProducts === 'true') {
        includeOptions.push({
          model: Produk,
          as: 'products',
          attributes: ['id', 'nama', 'harga', 'stok'],
        });
      }

      const category = await Category.findByPk(id, { include: includeOptions });

      if (!category) {
        return sendResponse(h, 404, false, 'Kategori tidak ditemukan');
      }

      return sendResponse(
        h,
        200,
        true,
        'Data kategori berhasil diambil',
        category
      );
    } catch (error) {
      console.error('Error in getCategoryById:', error);
      return sendResponse(
        h,
        500,
        false,
        'Terjadi kesalahan server',
        error.message
      );
    }
  },

  // 4. Get All Categories
  getAllCategories: async (request, h) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        includeProducts = 'false',
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = request.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (search) {
        whereClause.name = sequelize.where(
          sequelize.fn('UPPER', sequelize.col('name')),
          'LIKE',
          `%${search.toUpperCase()}%`
        );
      }

      let includeOptions = [];
      if (includeProducts === 'true') {
        includeOptions.push({
          model: Produk,
          as: 'products',
          attributes: ['id', 'nama', 'harga', 'stok'],
        });
      }

      const allowedSortFields = ['id', 'name', 'createdAt', 'updatedAt'];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';
      const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : 'DESC';

      const { count, rows } = await Category.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        limit: parseInt(limit),
        offset,
        order: [[validSortBy, validSortOrder]],
        distinct: true,
      });

      const totalPages = Math.ceil(count / parseInt(limit));

      return sendResponse(h, 200, true, 'Data kategori berhasil diambil', {
        categories: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return sendResponse(
        h,
        500,
        false,
        'Terjadi kesalahan server',
        error.message
      );
    }
  },

  // 5. Delete Category
  deleteCategory: async (request, h) => {
    try {
      const { id } = request.params;
      const { force = 'false' } = request.query;

      const category = await Category.findByPk(id);
      if (!category) {
        return sendResponse(h, 404, false, 'Kategori tidak ditemukan');
      }

      const productCount = await Produk.count({
        where: { categoryId: id },
      });

      if (productCount > 0 && force !== 'true') {
        return sendResponse(
          h,
          400,
          false,
          `Kategori tidak dapat dihapus karena masih digunakan oleh ${productCount} produk. Gunakan parameter force=true untuk menghapus paksa.`,
          { productCount }
        );
      }

      if (productCount > 0 && force === 'true') {
        await Produk.update(
          { categoryId: null },
          { where: { categoryId: id } }
        );
      }

      await category.destroy();
      const message =
        productCount > 0
          ? `Kategori berhasil dihapus dan ${productCount} produk telah dilepas dari kategori ini`
          : 'Kategori berhasil dihapus';

      return sendResponse(h, 200, true, message, {
        deletedCategory: category,
        affectedProducts: productCount,
      });
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      return sendResponse(
        h,
        500,
        false,
        'Terjadi kesalahan server',
        error.message
      );
    }
  },

  // Bonus: Get Categories with Product Count
  getCategoriesWithProductCount: async (request, h) => {
    try {
      const { search = '' } = request.query;

      const whereClause = {};
      if (search) {
        // DIUBAH: dari 'Nama' menjadi 'name'
        whereClause.name = { [Op.like]: `%${search}%` };
      }

      const categories = await Category.findAll({
        attributes: [
          'id',
          'name', // DIUBAH: dari 'Nama' menjadi 'name'
          'createdAt',
          'updatedAt',
          [sequelize.fn('COUNT', sequelize.col('products.id')), 'productCount'],
        ],
        include: [
          {
            model: Produk,
            as: 'products',
            attributes: [],
          },
        ],
        where: whereClause,
        // DIUBAH: dari 'Category.Nama' menjadi 'Category.name'
        group: [
          'Category.id',
          'Category.name',
          'Category.createdAt',
          'Category.updatedAt',
        ],
        order: [['name', 'ASC']], // DIUBAH: dari 'Nama' menjadi 'name'
      });

      return sendResponse(
        h,
        200,
        true,
        'Data kategori dengan jumlah produk berhasil diambil',
        categories
      );
    } catch (error) {
      console.error('Error in getCategoriesWithProductCount:', error);
      return sendResponse(
        h,
        500,
        false,
        'Terjadi kesalahan server',
        error.message
      );
    }
  },

  // Bonus: Bulk Delete Categories
  bulkDeleteCategories: async (request, h) => {
    try {
      const { categoryIds } = request.payload;
      const { force = 'false' } = request.query;

      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return sendResponse(
          h,
          400,
          false,
          'categoryIds harus berupa array dan tidak boleh kosong'
        );
      }

      const categories = await Category.findAll({
        where: { id: { [Op.in]: categoryIds } },
      });
      if (categories.length === 0) {
        return sendResponse(h, 404, false, 'Tidak ada kategori yang ditemukan');
      }

      const foundIds = categories.map((cat) => cat.id);
      const notFoundIds = categoryIds.filter(
        (id) => !foundIds.includes(parseInt(id))
      );

      const productCount = await Produk.count({
        // DIUBAH: dari 'Category_id' menjadi 'categoryId'
        where: { categoryId: { [Op.in]: foundIds } },
      });

      if (productCount > 0 && force !== 'true') {
        return sendResponse(
          h,
          400,
          false,
          `${productCount} produk masih menggunakan kategori yang akan dihapus. Gunakan parameter force=true untuk menghapus paksa.`,
          { productCount, affectedCategories: foundIds.length }
        );
      }

      if (productCount > 0 && force === 'true') {
        await Produk.update(
          { categoryId: null }, // DIUBAH: dari 'Category_id' menjadi 'categoryId'
          { where: { categoryId: { [Op.in]: foundIds } } } // DIUBAH: dari 'Category_id' menjadi 'categoryId'
        );
      }

      const deletedCount = await Category.destroy({
        where: { id: { [Op.in]: foundIds } },
      });

      return sendResponse(
        h,
        200,
        true,
        `${deletedCount} kategori berhasil dihapus`,
        {
          deletedCount,
          affectedProducts: productCount,
          notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
        }
      );
    } catch (error) {
      console.error('Error in bulkDeleteCategories:', error);
      return sendResponse(
        h,
        500,
        false,
        'Terjadi kesalahan server',
        error.message
      );
    }
  },
};

module.exports = categoryController;
