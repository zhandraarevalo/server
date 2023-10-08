const joi = require('joi');
const express = require('express');
const router = express.Router();

const { Backup, UserCurrency, Wallet, WalletBackup } = require('../../models');
const { DecryptRequest } = require('../../policies');
const response = require('../../responses');
const { Logger, Messenger, Security, Utils } = require('../../services');

const walletSchema = joi.object().keys({
  account: joi.number().integer().required(),
  type: joi.string().required(),
  name: joi.string().required(),
  balance: joi.number().integer().required(),
}).unknown(false);

router.get('/', async (req, res) => {
  const logger = Logger.set('wallet_get');

  try {
    const { user } = req.session;
    const userCurrencies = await UserCurrency.findBy(global.db, { where: { user: user.id }, populate: ['account', 'currency'] });

    const accountList = userCurrencies.map(item => {
      for (const uc of item.accountList) {
        uc.currency = item.currency;
      }
      return item.accountList;
    }).flat().sort(Utils.sortAscByName);
    const accountIds = accountList.map(item => item.id);

    const wallets = await Wallet.findIn(global.db, { arr: accountIds, field: 'account' });

    const walletList = [];
    for (const account of accountList) {
      const accountWallets = wallets.filter((item) => item.account === account.id).sort(Utils.sortAscByName);
      for (const wallet of accountWallets) {
        wallet.account = account;
        walletList.push(wallet);
      }
    }

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { walletList });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.get('/:id', async (req, res) => {
  const logger = Logger.set('wallet_get_one');

  try {
    const { id } = req.params;
    const wallet = await Wallet.findOne(global.db, { id, populate: ['account'] });

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { wallet });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.post('/', DecryptRequest, async (req, res) => {
  const logger = Logger.set('wallet_post');

  try {
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(walletSchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    await global.db.transaction(async (db) => {
      const wallet = await Wallet.create(db, { obj: body, fetch: true });

      const date = new Date();
      const backupDate = new Date(date.getFullYear(), date.getMonth(), 0);
      let backup = await Backup.findOneBy(db, { where: { date: backupDate} });

      if (!backup) {
        backup = await Backup.create(db, { obj: { date: backupDate }, fetch: true });
      }

      await WalletBackup.create(db, { obj: {
        balance: wallet.balance,
        wallet: wallet.id,
        backup: backup.id,
      } });
      return response.created(req, res, Messenger.get(201));
    });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.put('/:id', DecryptRequest, async (req, res) => {
  const logger = Logger.set('wallet_put');

  try {
    const { id } = req.params;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(walletSchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    await Wallet.update(global.db, id).set(body);
    return response.created(req, res, Messenger.get(200));
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

module.exports = router;
