// seeders/YYYYMMDDHHMMSS-demo-staff.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "Staffs",
      [
        {
          Nama: "Budi Santoso",
          Gender: "L",
          NIK: "3301010101900001",
          No_WhatsApp: "081234567890",
          Dibuat: new Date(),
        },
        {
          Nama: "Ani Yudhoyono",
          Gender: "P",
          NIK: "3301010101910002",
          No_WhatsApp: "081234567891",
          Dibuat: new Date(),
        },
      ],
      {}
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Staffs", null, {});
  },
};
