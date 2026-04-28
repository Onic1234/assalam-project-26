// models/Transaction_detail.js
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Transaction_detail extends Model {
    static associate(models) {
      // Relasi ke tabel Transaksi
      Transaction_detail.belongsTo(models.Transaksi, {
        foreignKey: "transactionId", // Menggunakan camelCase
        as: "transaction",
      });
      // Relasi ke tabel Produk
      Transaction_detail.belongsTo(models.Produk, {
        foreignKey: "productId", // Menggunakan camelCase
        as: "product",
      });
    }
  }
  Transaction_detail.init(
    {
      // Nama kolom disesuaikan menjadi camelCase agar konsisten
      transactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "transactionId", // Eksplisit mapping ke kolom database jika perlu
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "productId",
      },
      quantity: {
        // Diubah dari 'amount' menjadi 'quantity'
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Transaction_detail",
      tableName: "transaction_details", // Pastikan nama tabel huruf kecil
    }
  );
  return Transaction_detail;
};
