// models/Asset.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Asset extends Model {
    static associate(models) {
      // Associations can be defined here if needed
    }
  }
  
  Asset.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      kode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kategori: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lokasi: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      coa: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      merk_type: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      vendor: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tahun_perolehan: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      harga_perolehan: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      umur_aktiva: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      periode_maintenance: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      scheduled_months: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      schedule_details: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      status_maintenance: {
        type: DataTypes.ENUM("No Maintenance", "Scheduled", "Pending", "Done", "Overdue"),
        allowNull: false,
        defaultValue: "Scheduled",
      },
      status: {
        type: DataTypes.ENUM("Aktif", "Pasif", "Non Aktif"),
        allowNull: false,
        defaultValue: "Aktif",
      },
    },
    {
      sequelize,
      modelName: "Asset",
      tableName: "assets",
      timestamps: true,
    }
  );
  
  return Asset;
};
