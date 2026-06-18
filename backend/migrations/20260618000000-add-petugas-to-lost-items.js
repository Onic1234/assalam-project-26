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

    if (!tableDefinition.petugas_input) {
      await queryInterface.addColumn(targetTableName, 'petugas_input', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDefinition.petugas_klaim) {
      await queryInterface.addColumn(targetTableName, 'petugas_klaim', {
        type: Sequelize.STRING,
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

    if (tableDefinition.petugas_input) {
      await queryInterface.removeColumn(targetTableName, 'petugas_input');
    }

    if (tableDefinition.petugas_klaim) {
      await queryInterface.removeColumn(targetTableName, 'petugas_klaim');
    }
  }
};
