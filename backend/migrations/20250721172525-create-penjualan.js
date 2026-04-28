// migrations/YYYYMMDDHHMMSS-create-penjualan.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Penjualans", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      CustomerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      Tanggal_Kunjungan: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      Kategori: {
        type: Sequelize.ENUM("Reguler", "PPMI", "Santri", "Member", "Staff"),
        allowNull: false,
      },
      Kuantitas: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      Metode_Pembayaran: {
        type: Sequelize.ENUM("Tunai", "QRIS"),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Penjualans");
  },
};
