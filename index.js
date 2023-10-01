require('dotenv').config();

const express = require('express');
const app = express();

const { router } = require('./api');

app.use('/api', router);

app.listen(process.env.SYS_PORT, async () => {
  console.log(`>> server running in port ${process.env.SYS_PORT}...\n`);
});
