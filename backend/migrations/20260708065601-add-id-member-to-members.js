"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Members", "id_member", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Members", "id_member");
  },
};
