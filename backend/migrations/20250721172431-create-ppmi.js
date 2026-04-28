// migrations/YYYYMMDDHHMMSS-create-ppmi.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PPMIs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      Username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      FaceID: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      Dibuat: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      Login_Terakhir: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("PPMIs");
  },
};

