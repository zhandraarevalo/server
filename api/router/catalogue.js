const express = require('express');
const router = express.Router();

const response = require('../responses');
const { Catalogue } = require('../models');
const { Logger, Messenger, Security, Utils } = require('../services');

router.get('/:code', async (req, res) => {
  const logger = Logger.set('catalogue_get');

  try {
    const { code } = req.params;

    const list = await Catalogue.findBy(global.db, { where: { code } });

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { list });
    msg.token = await Security.encryptWithCert({ key });

    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

module.exports = router;
