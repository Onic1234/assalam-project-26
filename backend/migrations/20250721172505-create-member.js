// migrations/YYYYMMDDHHMMSS-create-member.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Members", {
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
      Jenis_Kelamin: {
        type: Sequelize.ENUM("L", "P"),
        allowNull: true,
      },
      Jenis_Member: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      Tanggal_Kadaluarsa: {
        type: Sequelize.DATE,
        allowNull: false,
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
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Members");
  },
};

