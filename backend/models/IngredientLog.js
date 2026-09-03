// models/IngredientLog.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IngredientLog extends Model {
    static associate(models) {
      IngredientLog.belongsTo(models.Ingredient, {
        foreignKey: 'ingredientId',
        as: 'ingredient',
      });
      IngredientLog.belongsTo(models.Produk, {
        foreignKey: 'productId',
        as: 'product',
      });
    }
  }

  IngredientLog.init(
    {
      ingredientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM('USAGE_SALE', 'RESTOCK', 'ADJUSTMENT'),
        allowNull: false,
        defaultValue: 'USAGE_SALE',
      },
      quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      costTotal: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, // Total Rupiah (HPP) dari bahan yang terpakai/masuk
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'IngredientLog',
      tableName: 'ingredient_logs',
    }
  );

  return IngredientLog;
};
