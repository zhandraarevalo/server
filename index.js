const express = require('express');
const app = express();

const { router } = require('./api');

app.use('/api', router);

app.get('/', async (req, res) => {
  return res.send('<span>hello world</span>');
});

app.listen(7994, async () => {
  console.log(`>> server running in port 7994...\n`);
});
