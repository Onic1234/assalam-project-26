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
      // Relasi ke Transaction_detail
      Produk.hasMany(models.Transaction_detail, {
        foreignKey: 'productId', // Pastikan foreign key di Transaction_detail adalah 'productId'
        as: 'transaction_details', // Menyamakan alias dengan yang digunakan di controller
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
    },
    {
      sequelize,
      modelName: 'Produk',
      tableName: 'produks', // Eksplisit mendefinisikan nama tabel
    }
  );
  return Produk;
};
