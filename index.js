require('dotenv').config();

const express = require('express');
const mysql = require('mysql2-async').default;

const {
  bootstrap,
  datastore,
} = require('./config');
const {
  migrations,
  router,
  services: { Logger },
} = require('./api');

const db = new mysql(datastore);
global.db = db;

const app = express();

app.use('/api', router);

app.listen(process.env.SYS_PORT, async () => {
  const logger = Logger.set('server');

  await migrations(db);
  logger.info('database initialized');

  await bootstrap(db);
  logger.info('bootstrap executed');

  logger.info(`>> server running in port ${process.env.SYS_PORT}...\n`);
});
