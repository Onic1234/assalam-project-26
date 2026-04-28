// migrations/YYYYMMDDHHMMSS-create-reguler.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Regulers", {
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
      No_Telepon: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Regulers");
  },
};
