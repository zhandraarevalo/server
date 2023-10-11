const joi = require('joi');
const express = require('express');
const router = express.Router();

const { Account, Currency, UserCurrency } = require('../../models');
const { DecryptRequest } = require('../../policies');
const response = require('../../responses');
const { Logger, Messenger, Security, Utils } = require('../../services');

const accountSchema = joi.object().keys({
  name: joi.string().required(),
  currency: joi.number().integer().required(),
}).unknown(false);

router.get('/', async (req, res) => {
  const logger = Logger.set('account_get');

  try {
    const { user } = req.session;
    const userCurrencies = await UserCurrency.find(global.db, {
      where: [{ field: 'user', operator: '=', value: user.id }],
      populate: [{ field: 'account' }, { field: 'currency', conditions: { limit: 1 } }],
    });

    const accountList = userCurrencies.map(item => {
      for (const uc of item.accountList) {
        uc.currency = item.currency;
      }
      return item.accountList;
    }).flat().sort(Utils.sortAscByName);

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { accountList });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.get('/:id', async (req, res) => {
  const logger = Logger.set('account_get_one');

  try {
    const { id } = req.params;

    const currencyList = await Currency.find(global.db);
    const account = await Account.find(global.db, {
      where: [{ field: 'id', operator: '=', value: id }],
      populate: [{ field: 'currency', conditions: { limit: 1 } }],
      limit: 1,
    });
    account.currency = currencyList.find(item => item.id === account.currency.currency);

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { account });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);

  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.post('/', DecryptRequest, async (req, res) => {
  const logger = Logger.set('account_post');

  try {
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(accountSchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    await Account.create(global.db, { obj: body });
    return response.created(req, res, Messenger.get(201));
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.put('/:id', DecryptRequest, async (req, res) => {
  const logger = Logger.set('account_put');

  try {
    const { id } = req.params;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(accountSchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }
    
    await Account.update(global.db, id).set(body);
    return response.created(req, res, Messenger.get(200));
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

module.exports = router;
