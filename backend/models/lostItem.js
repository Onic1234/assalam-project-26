// models/lostItem.js
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LostItem extends Model {
    static associate(models) {
      // No associations needed for now
    }
  }
  LostItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nama_barang: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      deskripsi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tanggal_ditemukan: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      lokasi_ditemukan: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("Lost", "Claimed"),
        allowNull: false,
        defaultValue: "Lost",
      },
      foto_barang: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      nama_pemilik: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nomor_telepon_pemilik: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tanggal_diambil: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "LostItem",
      tableName: "lost_items",
      timestamps: true,
    }
  );
  return LostItem;
};
