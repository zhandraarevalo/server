const express = require('express');
const router = express.Router();

const { UserCurrency } = require('../../models');
const response = require('../../responses');
const { Logger, Messenger, Security, Utils } = require('../../services');

router.get('/', async (req, res) => {
  const logger = Logger.set('currency_get');

  try {
    const { user } = req.session;
    const currencyList = await UserCurrency.find(global.db, {
      where: [{ field: 'user', operator: '=', value: user.id }],
      populate: [{ field: 'currency', conditions: { limit: 1 }}],
    });

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { currencyList });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.get('/main', async (req, res) => {
  const logger = Logger.set('main_currency');

  try {
    const { user } = req.session;
    const mainCurrency = await UserCurrency.find(global.db, {
      where: { main: true, user: user.id },
      populate: [{ field: 'currency', conditions: { limit: 1 }}],
      limit: 1,
    });

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { mainCurrency });
    msg.token = await Security.encryptWithCert({ key });

    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

module.exports = router;
