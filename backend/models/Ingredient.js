// models/Ingredient.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Ingredient extends Model {
    static associate(models) {
      // Relasi ke Recipe
      Ingredient.hasMany(models.Recipe, {
        foreignKey: 'ingredientId',
        as: 'recipes',
      });
      // Relasi banyak ke banyak ke Produk via Recipe
      Ingredient.belongsToMany(models.Produk, {
        through: models.Recipe,
        foreignKey: 'ingredientId',
        otherKey: 'productId',
        as: 'produks',
      });
      // Relasi ke IngredientLog
      Ingredient.hasMany(models.IngredientLog, {
        foreignKey: 'ingredientId',
        as: 'logs',
      });
    }
  }

  Ingredient.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'gram', // gram, ml, pcs, kg, liter, dll
      },
      stock: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      minStock: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      costPerUnit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, // Harga beli per unit (misal Rp 10 per gram)
      },
    },
    {
      sequelize,
      modelName: 'Ingredient',
      tableName: 'ingredients',
    }
  );

  return Ingredient;
};
