// models/Santri.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Santri extends Model {
    static associate(models) {
      // Mendefinisikan bahwa satu Santri memiliki satu Saldo
      Santri.hasOne(models.Balance, {
        foreignKey: "ownerId",
        constraints: false,
        scope: { ownerType: "santri" }, // Kunci untuk relasi polimorfik
        as: "balance",
      });

      Santri.hasMany(models.Transaksi, {
        foreignKey: "santriId",
        as: "transaksis",
      });

      Santri.hasMany(models.Penjualan, {
        foreignKey: "CustomerId",
        constraints: false,
        scope: { Kategori: "Santri" },
      });
    }
  }
  Santri.init(
    {
      no: DataTypes.INTEGER,
      id_santri: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      nama_santri: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jenis_kelamin: {
        type: DataTypes.ENUM("L", "P"),
        allowNull: false,
      },
      kelas: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      FaceID: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "Santri",
      tableName: "santris", // Pastikan nama tabel huruf kecil
      // --- HOOK BARU DITAMBAHKAN DI SINI ---
      hooks: {
        // Fungsi ini akan berjalan secara otomatis setelah santri baru dibuat
        afterCreate: async (santri, options) => {
          // Dapatkan model Balance dari instance sequelize
          const { Balance } = santri.sequelize.models;
          // Buat entri saldo baru untuk santri ini
          await Balance.create({
            ownerId: santri.id,
            ownerType: "santri",
            amount: 0, // Saldo awal
          });
        },
        // Hook ini juga akan berjalan untuk setiap record saat menggunakan bulkCreate
        afterBulkCreate: async (santris, options) => {
          const { Balance } = sequelize.models;
          const balancesToCreate = santris.map((santri) => ({
            ownerId: santri.id,
            ownerType: "santri",
            amount: 0,
          }));
          await Balance.bulkCreate(balancesToCreate);
        },
      },
    }
  );
  return Santri;
};
