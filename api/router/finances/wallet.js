const joi = require('joi');
const express = require('express');
const router = express.Router();

const { Backup, Transaction, UserCurrency, Wallet, WalletBackup } = require('../../models');
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
    const userCurrencies = await UserCurrency.find(global.db, {
      where: [{ field: 'user', operator: '=', value: user.id }],
      populate: [{ field: 'account' }, { field: 'currency', conditions: { limit: 1 }}],
    });

    const accountList = userCurrencies.map(item => {
      for (const uc of item.accountList) {
        uc.currency = item.currency;
      }
      return item.accountList;
    }).flat().sort(Utils.sortAscByName);

    const walletList = [];
    if (accountList.length > 0) {
      const accountIds = accountList.map(item => item.id);
      const wallets = await Wallet.find(global.db, {
        isIn: [{ field: 'account', arr: accountIds }],
      });
  
      for (const account of accountList) {
        const accountWallets = wallets.filter((item) => item.account === account.id).sort(Utils.sortAscByName);
        for (const wallet of accountWallets) {
          wallet.account = account;
          walletList.push(wallet);
        }
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
    const wallet = await Wallet.find(global.db, {
      where: [{ field: 'id', operator: '=', value: id }],
      populate: [{ field: 'account', conditions: { limit: 1 } }],
      limit: 1,
    });

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

router.post('/:id/payments', DecryptRequest, async (req, res) => {
  const logger = Logger.set('wallet_get_payments');

  const schema = joi.object().keys({
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).unknown(false);

  try {
    const { id } = req.params;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(schema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const foundWallet = await Wallet.find(global.db, {
      where: [{ field: 'id', operator: '=', value: id }],
      populate: [{
        field: 'account',
        conditions: {
          populate: [{
            field: 'currency',
            conditions: {
              populate: [{ field: 'currency', conditions: { limit: 1 } }],
              limit: 1,
            }
          }],
          limit: 1,
        }
      }],
      limit: 1,
    });
    const { account: accountData, ...wallet } = foundWallet;
    const { currency, ...account } = accountData;
    const currencyIso = currency.currency.iso;
    wallet.account = account;
    wallet.currency = currencyIso;

    const dateSince = new Date(body.year, body.month, 0);
    const dateUntil = new Date(body.year, body.month + 1, 0);

    const backup = await Backup.find(global.db, {
      where: [{ field: 'date', operator: '=', value: dateSince }],
      populate: [{ field: 'wallet_backup', conditions: {
        where: [{ field: 'wallet', operator: '=', value: id }],
        limit: 1,
      }}],
      limit: 1,
    });
    const previousBalance = backup.walletBackup.balance;

    const transactionList = await Transaction.find(global.db, {
      where: [
        { field: 'date', operator: '>', value: dateSince },
        { field: 'date', operator: '<=', value: dateUntil },
      ],
      populate: [
        { field: 'payment', conditions: { where: [{ field: 'wallet', operator: '=', value: id }] } },
        { field: 'category', conditions: {
          populate: [{ field: 'group', conditions: { limit: 1 } }],
          limit: 1,
        }},
      ],
      sort: [
        { field: 'date', order: 'asc' },
      ],
    });
    
    const paymentList = [];
    for (const transaction of transactionList) {
      if (transaction.paymentList.length > 0) {
        for (const payment of transaction.paymentList) {
          const operation = payment.type === 'entry' ? 1 : -1;
          paymentList.push({
            date: transaction.date,
            group: transaction.category.group.name,
            category: transaction.category.name,
            amount: operation * payment.amount,
          });
        }
      }
    }

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { wallet, paymentList, previousBalance });
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
    const { user } = req.session;
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
      let backup = await Backup.find(db, {
        where: [
          { field: 'user', operator: '=', value: user.id },
          { field: 'date', operator: '=', value: backupDate },
        ],
        limit: 1,
      });

      if (!backup) {
        backup = await Backup.create(db, { obj: { user: user.id, date: backupDate }, fetch: true });
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
