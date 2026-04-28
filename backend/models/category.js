// models/category.js
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      Category.hasMany(models.Produk, {
        foreignKey: "categoryId", // Disesuaikan menjadi camelCase
        as: "products",
      });
    }
  }
  Category.init(
    {
      // Nama kolom disesuaikan menjadi huruf kecil
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "categories", // Eksplisit mendefinisikan nama tabel
    }
  );
  return Category;
};
