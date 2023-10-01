const express = require('express');
const app = express();

app.get('/', async (req, res) => {
  return res.send('<span>hello world</span>');
});

app.get('/api/test', async (req, res) => {
  console.log('hello world');
  return res.status(200).json({ status: 'OK' });
});

app.listen(7994, async () => {
  console.log(`>> server running in port 7994...\n`);
});
