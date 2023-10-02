const express = require('express');
const router = express.Router();

const auth = require('./auth');
const catalogue = require('./catalogue');

router.use('/auth', auth);
router.use('/catalogue', catalogue);

module.exports = router;
