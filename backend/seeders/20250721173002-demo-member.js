// seeders/YYYYMMDDHHMMSS-demo-member.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 30); // Kadaluarsa 30 hari dari sekarang

    await queryInterface.bulkInsert(
      "Members",
      [
        {
          Nama: "Rina Herawati",
          Jenis_Kelamin: "P",
          Jenis_Member: "Siswa",
          Tanggal_Kadaluarsa: tomorrow,
          FaceID: "faceid_member_001",
          Dibuat: new Date(),
        },
      ],
      {}
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Members", null, {});
  },
};
