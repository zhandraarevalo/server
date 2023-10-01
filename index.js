require('dotenv').config();

const express = require('express');
const mysql = require('mysql2-async').default;

const { datastore } = require('./config');
const { router } = require('./api');

const db = new mysql(datastore);
global.db = db;

const app = express();

app.use('/api', router);

app.listen(process.env.SYS_PORT, async () => {
  console.log(`>> server running in port ${process.env.SYS_PORT}...\n`);
});
