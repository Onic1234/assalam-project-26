"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TicketPrice extends Model {
    static associate(models) {
      // define association here
    }
  }
  TicketPrice.init(
    {
      kategori: {
        type: DataTypes.ENUM("Reguler", "Staff"),
        primaryKey: true, // Tambahkan ini
        allowNull: false, // Tambahkan ini
      },
      harga: {
        type: DataTypes.INTEGER,
        allowNull: false, // Tambahkan ini
        defaultValue: 0, // Tambahkan ini
      },
      // Menambahkan kolom untuk menyimpan persentase diskon.
      discountPercentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, // Diskon default adalah 0%
      },
    },
    {
      sequelize,
      modelName: "TicketPrice",
      tableName: "TicketPrices", // Tambahkan ini
      timestamps: false, // Tambahkan ini
    }
  );
  return TicketPrice;
};

