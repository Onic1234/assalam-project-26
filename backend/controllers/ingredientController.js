// controllers/ingredientController.js
const { Ingredient, IngredientLog, Produk } = require('../models');

const sendResponse = (h, status, success, message, data = null) => {
  return h.response({ success, message, data }).code(status);
};

const ingredientController = {
  // GET /ingredients
  getAllIngredients: async (request, h) => {
    try {
      const ingredients = await Ingredient.findAll({
        order: [['name', 'ASC']],
      });
      return sendResponse(h, 200, true, 'Data bahan baku berhasil diambil', ingredients);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      return sendResponse(h, 500, false, 'Gagal mengambil data bahan baku', error.message);
    }
  },

  // GET /ingredients/logs (Monitoring & Audit Penggunaan Bahan)
  getIngredientLogs: async (request, h) => {
    try {
      const logs = await IngredientLog.findAll({
        include: [
          {
            model: Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name', 'unit', 'costPerUnit'],
          },
          {
            model: Produk,
            as: 'product',
            attributes: ['id', 'name', 'price'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 100,
      });

      // Hitung total pengeluaran Rupiah bahan baku yang terpakai
      const totalExpense = logs
        .filter((l) => l.type === 'USAGE_SALE')
        .reduce((sum, l) => sum + (l.costTotal || 0), 0);

      return sendResponse(h, 200, true, 'Riwayat penggunaan bahan baku berhasil diambil', {
        totalExpense,
        logs,
      });
    } catch (error) {
      console.error('Error fetching ingredient logs:', error);
      return sendResponse(h, 500, false, 'Gagal mengambil riwayat penggunaan bahan', error.message);
    }
  },

  // POST /ingredients
  createIngredient: async (request, h) => {
    try {
      const { name, unit, stock, minStock, costPerUnit } = request.payload;
      if (!name || !unit) {
        return sendResponse(h, 400, false, 'Nama bahan dan satuan wajib diisi');
      }

      const ingredient = await Ingredient.create({
        name: name.trim(),
        unit: unit.trim().toLowerCase(),
        stock: parseFloat(stock) || 0,
        minStock: parseFloat(minStock) || 0,
        costPerUnit: parseInt(costPerUnit) || 0,
      });

      return sendResponse(h, 201, true, 'Bahan baku berhasil ditambahkan', ingredient);
    } catch (error) {
      console.error('Error creating ingredient:', error);
      return sendResponse(h, 500, false, 'Gagal menambah bahan baku', error.message);
    }
  },

  // PUT /ingredients/{id}
  updateIngredient: async (request, h) => {
    try {
      const { id } = request.params;
      const { name, unit, stock, minStock, costPerUnit } = request.payload;

      const ingredient = await Ingredient.findByPk(id);
      if (!ingredient) {
        return sendResponse(h, 404, false, 'Bahan baku tidak ditemukan');
      }

      await ingredient.update({
        name: name !== undefined ? name.trim() : ingredient.name,
        unit: unit !== undefined ? unit.trim().toLowerCase() : ingredient.unit,
        stock: stock !== undefined ? parseFloat(stock) : ingredient.stock,
        minStock: minStock !== undefined ? parseFloat(minStock) : ingredient.minStock,
        costPerUnit: costPerUnit !== undefined ? parseInt(costPerUnit) : ingredient.costPerUnit,
      });

      return sendResponse(h, 200, true, 'Bahan baku berhasil diperbarui', ingredient);
    } catch (error) {
      console.error('Error updating ingredient:', error);
      return sendResponse(h, 500, false, 'Gagal mengubah bahan baku', error.message);
    }
  },

  // DELETE /ingredients/{id}
  deleteIngredient: async (request, h) => {
    try {
      const { id } = request.params;
      const ingredient = await Ingredient.findByPk(id);
      if (!ingredient) {
        return sendResponse(h, 404, false, 'Bahan baku tidak ditemukan');
      }

      await ingredient.destroy();
      return sendResponse(h, 200, true, 'Bahan baku berhasil dihapus');
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      return sendResponse(h, 500, false, 'Gagal menghapus bahan baku', error.message);
    }
  },

  // POST /ingredients/{id}/restock
  restockIngredient: async (request, h) => {
    try {
      const { id } = request.params;
      const { addQuantity } = request.payload;

      const qty = parseFloat(addQuantity);
      if (isNaN(qty) || qty <= 0) {
        return sendResponse(h, 400, false, 'Jumlah tambahan stok tidak valid');
      }

      const ingredient = await Ingredient.findByPk(id);
      if (!ingredient) {
        return sendResponse(h, 404, false, 'Bahan baku tidak ditemukan');
      }

      const newStock = ingredient.stock + qty;
      await ingredient.update({ stock: newStock });

      // Catat log audit restok
      await IngredientLog.create({
        ingredientId: ingredient.id,
        type: 'RESTOCK',
        quantity: qty,
        costTotal: Math.round(qty * ingredient.costPerUnit),
        notes: `Restok manual +${qty} ${ingredient.unit}`,
      });

      return sendResponse(h, 200, true, 'Stok bahan baku berhasil ditambahkan', ingredient);
    } catch (error) {
      console.error('Error restocking ingredient:', error);
      return sendResponse(h, 500, false, 'Gagal menambah stok bahan baku', error.message);
    }
  },
};

module.exports = ingredientController;
