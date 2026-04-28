// models/setting.js
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Setting extends Model {
    static associate(models) {
      // Tidak ada asosiasi yang dibutuhkan untuk model ini
    }
  }
  Setting.init(
    {
      key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      value: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Setting",
      tableName: "settings",
    }
  );
  return Setting;
};
