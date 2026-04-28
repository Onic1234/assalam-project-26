// models/Staff.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Staff extends Model {
    static associate(models) {
      Staff.hasMany(models.Penjualan, {
        foreignKey: "CustomerId",
        constraints: false,
        scope: {
          Kategori: "Staff",
        },
      });
    }
  }
  Staff.init(
    {
      Nama: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      Gender: {
        type: DataTypes.ENUM("L", "P"),
        allowNull: false,
      },
      No_WhatsApp: {
        type: DataTypes.STRING,
        allowNull: false, // Kunci unik tidak boleh null
        unique: true, // Ditetapkan sebagai kunci unik
      },
      Dibuat: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Staff",
      tableName: "staffs",
      timestamps: false,
    }
  );
  return Staff;
};
