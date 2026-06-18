'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    let targetTableName = 'lost_items';
    try {
      await queryInterface.describeTable('lost_items');
      targetTableName = 'lost_items';
    } catch (e) {
      try {
        await queryInterface.describeTable('LostItems');
        targetTableName = 'LostItems';
      } catch (e2) {
        targetTableName = 'lost_items';
      }
    }

    const tableDefinition = await queryInterface.describeTable(targetTableName);

    if (!tableDefinition.kode_barang) {
      await queryInterface.addColumn(targetTableName, 'kode_barang', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDefinition.foto_ktp) {
      await queryInterface.addColumn(targetTableName, 'foto_ktp', {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    let targetTableName = 'lost_items';
    try {
      await queryInterface.describeTable('lost_items');
      targetTableName = 'lost_items';
    } catch (e) {
      try {
        await queryInterface.describeTable('LostItems');
        targetTableName = 'LostItems';
      } catch (e2) {
        targetTableName = 'lost_items';
      }
    }

    const tableDefinition = await queryInterface.describeTable(targetTableName);

    if (tableDefinition.kode_barang) {
      await queryInterface.removeColumn(targetTableName, 'kode_barang');
    }

    if (tableDefinition.foto_ktp) {
      await queryInterface.removeColumn(targetTableName, 'foto_ktp');
    }
  }
};
