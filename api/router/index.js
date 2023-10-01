const express = require('express');
const router = express.Router();

const catalogue = require('./catalogue');

router.use('/catalogue', catalogue);

module.exports = router;
