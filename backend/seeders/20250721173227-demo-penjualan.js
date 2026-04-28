// seeders/YYYYMMDDHHMMSS-demo-penjualan.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "Penjualans",
      [
        // Penjualan untuk Staff dengan ID 1
        {
          CustomerId: 1,
          Kategori: "Staff",
          Kuantitas: 2,
          Metode_Pembayaran: "QRIS",
          Tanggal_Kunjungan: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Penjualan untuk Santri dengan ID 2
        {
          CustomerId: 2,
          Kategori: "Santri",
          Kuantitas: 1,
          Metode_Pembayaran: null, // Santri tidak pakai metode pembayaran
          Tanggal_Kunjungan: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Penjualan untuk Reguler dengan ID 1
        {
          CustomerId: 1,
          Kategori: "Reguler",
          Kuantitas: 4,
          Metode_Pembayaran: "Tunai",
          Tanggal_Kunjungan: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Penjualans", null, {});
  },
};
