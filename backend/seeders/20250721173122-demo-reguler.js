// seeders/YYYYMMDDHHMMSS-demo-reguler.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "Regulers",
      [
        {
          Nama: "Pengunjung Umum 1",
          No_Telepon: "089987654321",
        },
      ],
      {}
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Regulers", null, {});
  },
};
