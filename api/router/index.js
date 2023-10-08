const express = require('express');
const router = express.Router();

const { Authenticated, UpdateSession } = require('../policies');

const auth = require('./auth');
const catalogue = require('./catalogue');
const finances = require('./finances');

router.use('/auth', auth);
router.use('/catalogue', Authenticated, catalogue);
router.use('/finances', Authenticated, UpdateSession, finances);

module.exports = router;
