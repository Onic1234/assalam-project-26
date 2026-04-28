// models/balance.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Balance extends Model {
    static associate(models) {
      // Mendefinisikan bahwa Saldo ini bisa dimiliki oleh Santri atau Admin
      Balance.belongsTo(models.Santri, {
        foreignKey: "ownerId",
        constraints: false,
      });
      Balance.belongsTo(models.Admin, {
        foreignKey: "ownerId",
        constraints: false,
      });
    }
  }
  Balance.init(
    {
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ownerType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Balance",
      tableName: "balances", // Pastikan nama tabel huruf kecil
    }
  );
  return Balance;
};
