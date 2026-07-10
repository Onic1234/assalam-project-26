'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Alter Metode_Pembayaran column to VARCHAR(255)
    await queryInterface.changeColumn('penjualans', 'Metode_Pembayaran', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 2. Alter Kategori column to VARCHAR(255)
    await queryInterface.changeColumn('penjualans', 'Kategori', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // 3. Add id_member column if it does not exist
    const tableInfo = await queryInterface.describeTable('penjualans');
    if (!tableInfo.id_member) {
      await queryInterface.addColumn('penjualans', 'id_member', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('penjualans', 'id_member');
    } catch (e) {
      // Ignore if column doesn't exist
    }
  }
};
