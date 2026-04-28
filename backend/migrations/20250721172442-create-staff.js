// migrations/YYYYMMDDHHMMSS-create-staff.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Staffs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      Nama: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      Gender: {
        type: Sequelize.ENUM("L", "P"),
        allowNull: false,
      },
      NIK: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      No_WhatsApp: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      Dibuat: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Staffs");
  },
};

