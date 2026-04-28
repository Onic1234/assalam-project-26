// models/Transaksi.js
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Transaksi extends Model {
    static associate(models) {
      Transaksi.belongsTo(models.Santri, {
        foreignKey: "santriId",
        as: "santri",
      });
      Transaksi.hasMany(models.Transaction_detail, {
        foreignKey: "transactionId",
        as: "details",
      });
      Transaksi.belongsTo(models.Admin, {
        foreignKey: "kasirId",
        as: "kasir",
      });
    }
  }
  Transaksi.init(
    {
      // --- KOLOM INI DIUBAH ---
      santriId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Diubah menjadi true agar bisa null
        references: {
          model: "Santris",
          key: "id",
        },
      },
      kasirId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Admins",
          key: "id",
        },
      },
      total_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Transaksi",
    }
  );
  return Transaksi;
};
