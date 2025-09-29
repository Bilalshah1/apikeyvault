/*
  Drop the api_keys table using the existing Sequelize connection.
  Usage (PowerShell):
    $env:DATABASE_URL="postgres://..."; node scripts/drop-api-keys.js
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../models');

(async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected. Dropping table api_keys ...');
    await sequelize.getQueryInterface().dropTable('api_keys');
    console.log('✅ Dropped table api_keys');
  } catch (err) {
    console.error('❌ Failed to drop table:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();


