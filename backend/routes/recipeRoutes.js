// routes/recipeRoutes.js
const recipeController = require('../controllers/recipeController');

const recipeRoutes = [
  {
    method: 'GET',
    path: '/products/{productId}/recipe',
    handler: recipeController.getProductRecipe,
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },
  {
    method: 'POST',
    path: '/products/{productId}/recipe',
    handler: recipeController.saveProductRecipe,
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },
];

module.exports = recipeRoutes;
