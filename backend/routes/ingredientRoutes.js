// routes/ingredientRoutes.js
const ingredientController = require('../controllers/ingredientController');

const ingredientRoutes = [
  {
    method: 'GET',
    path: '/ingredients',
    handler: ingredientController.getAllIngredients,
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },
  {
    method: 'GET',
    path: '/ingredients/logs',
    handler: ingredientController.getIngredientLogs,
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },
  {
    method: 'POST',
    path: '/ingredients',
    handler: ingredientController.createIngredient,
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },
  {
    method: 'PUT',
    path: '/ingredients/{id}',
    handler: ingredientController.updateIngredient,
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },
  {
    method: 'DELETE',
    path: '/ingredients/{id}',
    handler: ingredientController.deleteIngredient,
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },
  {
    method: 'POST',
    path: '/ingredients/{id}/restock',
    handler: ingredientController.restockIngredient,
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },
];

module.exports = ingredientRoutes;
