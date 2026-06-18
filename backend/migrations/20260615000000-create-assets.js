"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("assets", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      kode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kategori: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lokasi: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      coa: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      merk_type: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      vendor: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tahun_perolehan: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      harga_perolehan: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      umur_aktiva: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      periode_maintenance: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      scheduled_months: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      schedule_details: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      status_maintenance: {
        type: Sequelize.ENUM("No Maintenance", "Scheduled", "Pending", "Done", "Overdue"),
        allowNull: false,
        defaultValue: "Scheduled",
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
    await queryInterface.dropTable("assets");
  },
};
