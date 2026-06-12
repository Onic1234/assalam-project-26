const { Sequelize } = require('sequelize');
const config = require('./config/config.json').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  ...config,
  logging: false,
});

async function run() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    await queryInterface.addColumn('Produks', 'image', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
    console.log('SUCCESS: Successfully added image column to Produks table!');
  } catch (e) {
    if (e.message.includes('duplicate column') || e.message.includes('already exists') || e.message.includes('Duplicate column name')) {
      console.log('INFO: Column "image" already exists in Produks table.');
    } else {
      console.error('ERROR:', e.message);
    }
  } finally {
    await sequelize.close();
  }
}
run();
