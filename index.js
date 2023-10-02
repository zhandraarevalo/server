require('dotenv').config();

var express = require('express');
var cors = require('cors');

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var mysql = require('mysql2-async').default;

const { datastore } = require('./config');
const {
  migrations,
  router,
  services: { Logger },
} = require('./api');

const db = new mysql(datastore);
global.db = db;

var corsOptions = {
  origin: process.env.MONARCH_DOMAIN,
  optionsSuccessStatus: 200,
}

const app = express();

app.use('/api', cors(corsOptions), jsonParser, router);

app.listen(process.env.SYS_PORT, async () => {
  const logger = Logger.set('server');

  await migrations(db);
  logger.info('database initialized');

  logger.info(`>> server running in port ${process.env.SYS_PORT}...\n`);
});
