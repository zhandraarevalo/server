const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  return res.send('<span>hello world</span>');
});

router.get('/test', async (req, res) => {
  return res.status(200).json({ status: 'OK' });
});

module.exports = router;