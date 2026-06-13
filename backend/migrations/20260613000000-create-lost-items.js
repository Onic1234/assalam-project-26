"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("lost_items", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      nama_barang: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tanggal_ditemukan: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      lokasi_ditemukan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("Lost", "Claimed"),
        allowNull: false,
        defaultValue: "Lost",
      },
      foto_barang: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      nama_pemilik: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nomor_telepon_pemilik: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tanggal_diambil: {
        type: Sequelize.DATE,
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
  async down(queryInterface) {
    await queryInterface.dropTable("lost_items");
  },
};
