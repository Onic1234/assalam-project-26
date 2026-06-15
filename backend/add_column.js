const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('./config/config.json')[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  ...config,
  logging: false,
});

async function run() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if table 'produks' (lowercase) or 'Produks' (uppercase) exists
    let targetTableName = 'produks';
    try {
      await queryInterface.describeTable('produks');
      targetTableName = 'produks';
    } catch (e) {
      try {
        await queryInterface.describeTable('Produks');
        targetTableName = 'Produks';
      } catch (e2) {
        throw new Error('Neither "produks" nor "Produks" table could be found in the database.');
      }
    }

    const tableDefinition = await queryInterface.describeTable(targetTableName);
    if (!tableDefinition.image) {
      await queryInterface.addColumn(targetTableName, 'image', {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      });
      console.log(`SUCCESS: Successfully added image column to ${targetTableName} table!`);
    } else {
      console.log(`INFO: Column "image" already exists in ${targetTableName} table.`);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await sequelize.close();
  }
}
run();
