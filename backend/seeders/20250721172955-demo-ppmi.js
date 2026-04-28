// seeders/YYYYMMDDHHMMSS-demo-ppmi.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "PPMIs",
      [
        {
          Username: "ppmi_user_1",
          FaceID: "faceid_ppmi_123",
          Dibuat: new Date(),
          Login_Terakhir: new Date(),
        },
        {
          Username: "ppmi_user_2",
          FaceID: "faceid_ppmi_456",
          Dibuat: new Date(),
          Login_Terakhir: new Date(),
        },
      ],
      {}
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("PPMIs", null, {});
  },
};
