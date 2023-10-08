const express = require('express');
const router = express.Router();

const account = require('./account');
const category = require('./category');
const currency = require('./currency');
const group = require('./group');
const wallet = require('./wallet');

router.use('/account', account);
router.use('/category', category);
router.use('/currency', currency);
router.use('/group', group);
router.use('/wallet', wallet);

module.exports = router;
