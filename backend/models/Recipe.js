// models/Recipe.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Recipe extends Model {
    static associate(models) {
      Recipe.belongsTo(models.Produk, {
        foreignKey: 'productId',
        as: 'product',
      });
      Recipe.belongsTo(models.Ingredient, {
        foreignKey: 'ingredientId',
        as: 'ingredient',
      });
    }
  }

  Recipe.init(
    {
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ingredientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0, // Takaran per 1 porsi sajian produk
      },
    },
    {
      sequelize,
      modelName: 'Recipe',
      tableName: 'recipes',
    }
  );

  return Recipe;
};
