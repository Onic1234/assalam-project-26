// models/Admin.js
"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    validPassword(password) {
      return bcrypt.compare(password, this.password);
    }

    static associate(models) {
      // Mendefinisikan bahwa satu Admin memiliki satu Saldo
      Admin.hasOne(models.Balance, {
        foreignKey: "ownerId",
        constraints: false,
        scope: { ownerType: "admin" }, // Kunci untuk relasi polimorfik
        as: "balance",
      });
    }
  }
  Admin.init(
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("admin", "kasir"),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Admin",
      tableName: "admins", // Pastikan nama tabel huruf kecil
      hooks: {
        beforeCreate: async (admin) => {
          if (admin.password) {
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(admin.password, salt);
          }
        },
      },
    }
  );
  return Admin;
};
