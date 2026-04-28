"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hapus kolom 'balance' dari tabel Admins
    await queryInterface.removeColumn("Admins", "balance");

    // Hapus kolom lama 'santriId' dari tabel Balances
    await queryInterface.removeColumn("Balances", "santriId");

    // Tambah kolom baru untuk polymorphic association
    await queryInterface.addColumn("Balances", "ownerId", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.addColumn("Balances", "ownerType", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Kembalikan kolom 'balance' ke tabel Admins
    await queryInterface.addColumn("Admins", "balance", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Kembalikan kolom 'santriId' ke tabel Balances
    await queryInterface.addColumn("Balances", "santriId", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Santris",
        key: "id",
      },
    });

    // Hapus kolom polymorphic
    await queryInterface.removeColumn("Balances", "ownerId");
    await queryInterface.removeColumn("Balances", "ownerType");
  },
};
