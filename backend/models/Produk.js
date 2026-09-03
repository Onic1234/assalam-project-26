// models/Produk.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Produk extends Model {
    static associate(models) {
      // Relasi ke Category
      Produk.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category',
      });
      // Relasi ke Recipe
      Produk.hasMany(models.Recipe, {
        foreignKey: 'productId',
        as: 'recipes',
      });
      // Relasi banyak ke banyak ke Ingredient via Recipe
      Produk.belongsToMany(models.Ingredient, {
        through: models.Recipe,
        foreignKey: 'productId',
        otherKey: 'ingredientId',
        as: 'ingredients',
      });
    }
  }
  Produk.init(
    {
      // Properti model menggunakan camelCase, dipetakan ke kolom database
      name: {
        type: DataTypes.STRING,
        field: 'name', // Eksplisit mapping ke kolom 'name' di database
        allowNull: false,
      },
      price: {
        type: DataTypes.INTEGER,
        field: 'price', // Eksplisit mapping ke kolom 'price'
        allowNull: false,
      },
      stock: {
        type: DataTypes.INTEGER,
        field: 'stock', // Eksplisit mapping ke kolom 'stock'
        allowNull: false,
        defaultValue: 0,
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      image: {
        type: DataTypes.TEXT('long'),
        field: 'image',
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Produk',
      tableName: 'produks', // Eksplisit mendefinisikan nama tabel
    }
  );
  return Produk;
};
