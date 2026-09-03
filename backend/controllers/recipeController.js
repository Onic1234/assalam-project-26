// controllers/recipeController.js
const { Recipe, Ingredient, Produk } = require('../models');

const sendResponse = (h, status, success, message, data = null) => {
  return h.response({ success, message, data }).code(status);
};

const recipeController = {
  // GET /products/{productId}/recipe
  getProductRecipe: async (request, h) => {
    try {
      const { productId } = request.params;
      const recipes = await Recipe.findAll({
        where: { productId },
        include: [
          {
            model: Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name', 'unit', 'stock', 'costPerUnit'],
          },
        ],
      });

      let totalCostPerPortion = 0;
      const items = recipes.map((r) => {
        const ingCost = r.ingredient ? r.ingredient.costPerUnit : 0;
        const costForThisIngredient = r.quantity * ingCost;
        totalCostPerPortion += costForThisIngredient;
        return {
          id: r.id,
          ingredientId: r.ingredientId,
          ingredientName: r.ingredient ? r.ingredient.name : '',
          unit: r.ingredient ? r.ingredient.unit : '',
          currentStock: r.ingredient ? r.ingredient.stock : 0,
          costPerUnit: ingCost,
          quantity: r.quantity,
          totalCost: costForThisIngredient,
        };
      });

      return sendResponse(h, 200, true, 'Resep produk berhasil diambil', {
        productId: parseInt(productId),
        totalCostPerPortion,
        ingredients: items,
      });
    } catch (error) {
      console.error('Error fetching product recipe:', error);
      return sendResponse(h, 500, false, 'Gagal mengambil resep produk', error.message);
    }
  },

  // POST /products/{productId}/recipe
  saveProductRecipe: async (request, h) => {
    try {
      const { productId } = request.params;
      const { items } = request.payload;

      const product = await Produk.findByPk(productId);
      if (!product) {
        return sendResponse(h, 404, false, 'Produk tidak ditemukan');
      }

      await Recipe.destroy({ where: { productId } });

      if (Array.isArray(items) && items.length > 0) {
        const recipeRows = items
          .filter((item) => item.ingredientId && parseFloat(item.quantity) > 0)
          .map((item) => ({
            productId: parseInt(productId),
            ingredientId: parseInt(item.ingredientId),
            quantity: parseFloat(item.quantity),
          }));

        if (recipeRows.length > 0) {
          await Recipe.bulkCreate(recipeRows);
        }
      }

      return sendResponse(h, 200, true, 'Resep produk berhasil disimpan');
    } catch (error) {
      console.error('Error saving product recipe:', error);
      return sendResponse(h, 500, false, 'Gagal menyimpan resep produk', error.message);
    }
  },
};

module.exports = recipeController;
