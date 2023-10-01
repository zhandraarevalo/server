const express = require('express');
const router = express.Router();

const response = require('../responses');
const { Logger, Messenger } = require('../services');
const { Catalogue } = require('../models');

router.get('/:code', async (req, res) => {
  const logger = Logger.set('catalogue_get');

  try {
    const { code } = req.params;

    const list = await Catalogue.findBy(global.db, { where: { code } });

    return response.ok(req, res, Messenger.get(200), { list });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

module.exports = router;
