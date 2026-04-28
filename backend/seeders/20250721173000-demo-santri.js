// seeders/YYYYMMDDHHMMSS-demo-santri.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "Santris",
      [
        {
          no: 1,
          id_santri: "SNT2024001",
          nama_santri: "Ahmad Fauzi",
          jenis_kelamin: "L",
          kelas: "XII IPA 1",
          unit: "Asrama Putra Al-Ikhlas",
          FaceID: "text_representation_of_faceid_santri_001",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          no: 2,
          id_santri: "SNT2024002",
          nama_santri: "Siti Aminah",
          jenis_kelamin: "P",
          kelas: "XI IPS 3",
          unit: "Asrama Putri An-Nur",
          FaceID: "text_representation_of_faceid_santri_002",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Santris", null, {});
  },
};
