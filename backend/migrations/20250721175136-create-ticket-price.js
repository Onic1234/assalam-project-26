"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("TicketPrices", {
      kategori: {
        type: Sequelize.ENUM("Reguler", "Staff"),
        primaryKey: true,
        allowNull: false,
      },
      harga: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("TicketPrices");
  },
};

