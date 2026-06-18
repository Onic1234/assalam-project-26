'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table name is lowercase 'produks' or uppercase 'Produks'
    let targetTableName = 'produks';
    try {
      await queryInterface.describeTable('produks');
      targetTableName = 'produks';
    } catch (e) {
      try {
        await queryInterface.describeTable('Produks');
        targetTableName = 'Produks';
      } catch (e2) {
        // Default to 'produks' if neither exists, so it fails with a clear message
        targetTableName = 'produks';
      }
    }

    // Add column if it doesn't already exist
    const tableDefinition = await queryInterface.describeTable(targetTableName);
    if (!tableDefinition.image) {
      await queryInterface.addColumn(targetTableName, 'image', {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    let targetTableName = 'produks';
    try {
      await queryInterface.describeTable('produks');
      targetTableName = 'produks';
    } catch (e) {
      try {
        await queryInterface.describeTable('Produks');
        targetTableName = 'Produks';
      } catch (e2) {
        targetTableName = 'produks';
      }
    }

    const tableDefinition = await queryInterface.describeTable(targetTableName);
    if (tableDefinition.image) {
      await queryInterface.removeColumn(targetTableName, 'image');
    }
  }
};
