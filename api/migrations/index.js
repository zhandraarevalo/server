var fs = require('fs').promises;
var path = require('path');

var { Logger } = require('../services');

module.exports = async (db) => {
  const logger = Logger.set('migration_process');

  try {
    let migratedTables = [];

    const files = await fs.readdir(__dirname);

    try {
      migratedTables = await db.getall('select * from migrations');
    } catch (err) { }

    for (const fileName of files) {
      if (fileName !== 'index.js') {
        const migrationName = fileName.split('.js')[0];

        if (migratedTables.length === 0 && !migrationName.includes('migrations')) {
          migratedTables = await db.getall('select * from migrations');
        }

        const migrated = migratedTables.map((migration) => migration.name).includes(migrationName);

        if (!migrated) {
          const file = require(path.join(__dirname, fileName));
          await db.execute(file);
          await db.insert('insert into migrations(name, created_at) value (?, ?)', [migrationName, new Date()]);
        }
      }
    }
  } catch (err) {
    logger.error('ServerError:', err);
  }
};
