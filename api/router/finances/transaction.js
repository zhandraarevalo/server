const joi = require('joi');
const express = require('express');
const router = express.Router();

const { Account, Payment, Transaction, Wallet } = require('../../models');
const { DecryptRequest } = require('../../policies');
const response = require('../../responses');
const { Logger, Messenger, Utils } = require('../../services');

router.post('/payment', DecryptRequest, async (req, res) => {
  const logger = Logger.set('transaction_payment');

  const schema = joi.object().keys({
    date: joi.date().required(),
    type: joi.string().required(),
    category: joi.number().integer().required(),
    payments: joi.array().items(joi.object().keys({
      type: joi.string().required(),
      amount: joi.number().integer().required(),
      wallet: joi.number().integer().required(),
    }).unknown(false)).required(),
  }).unknown(false);

  try {
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(schema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const { payments, ...transactionData } = body;
    const totalAmount = payments.reduce((total, payment) => {
      const operation = payment.type === 'entry' ? 1 : -1;
      return total + (operation * payment.amount);
    }, 0);
    transactionData.totalAmount = totalAmount;

    await global.db.transaction(async (db) => {
      const transaction = await Transaction.create(db, { obj: transactionData, fetch: true });

      for (const payment of payments) {
        payment.transaction = transaction.id;
        await Payment.create(db, { obj: payment });

        const m = payment.type === 'entry' ? 1 : -1;
        const wallet = await Wallet.find(db, {
          where: [{ field: 'id', operator: '=', value: payment.wallet }],
          limit: 1,
        });
        await Wallet.update(db, payment.wallet).set({ balance: wallet.balance + (m * payment.amount) });
      }

      return response.created(req, res, Messenger.get(201));
    });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.post('/transfer', DecryptRequest, async (req, res) => {
  const logger = Logger.set('transaction_transfer');

  const schema = joi.object().keys({
    date: joi.date().required(),
    type: joi.string().required(),
    category: joi.number().integer().required(),
    amount: joi.number().integer().required(),
    exitWallet: joi.number().integer().required(),
    entryWallet: joi.number().integer().required(),
  }).unknown(false);

  try {
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(schema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    await global.db.transaction(async (db) => {
      const { amount, entryWallet, exitWallet, ...transactionData } = body;
      transactionData.totalAmount = 0;
      const transaction = await Transaction.create(db, { obj: transactionData, fetch: true });

      const [ exit, entry ] = await Promise.all([
        Wallet.find(db, { where: [{ field: 'id', operator: '=', value: exitWallet }] }),
        Wallet.find(db, { where: [{ field: 'id', operator: '=', value: entryWallet }] }),
      ]);

      const [
        exitAccount,
        entryAccount,
      ] = await Promise.all([
        Account.find(db, {
          where: [{ field: 'id', operator: '=', value: exit.account }],
          populate: [{ field: 'currency', conditions: { limit: 1 } }],
          limit: 1,
        }),
        Account.find(db, {
          where: [{ field: 'id', operator: '=', value: entry.account }],
          populate: [{ field: 'currency', conditions: { limit: 1 } }],
          limit: 1,
        }),
      ]);

      if (exitAccount.currency.currency !== entryAccount.currency.currency) {
        return response.badRequest(Messenger.get(4001));
      }

      await Promise.all([
        Payment.create(db, { obj: { amount, type: 'exit', wallet: exitWallet, transaction: transaction.id } }),
        Payment.create(db, { obj: { amount, type: 'entry', wallet: entryWallet, transaction: transaction.id } }),
        Wallet.update(db, exitWallet).set({ balance: exit.balance - amount }),
        Wallet.update(db, entryWallet).set({ balance: entry.balance + amount }),
      ]);
      return response.created(req, res, Messenger.get(201));
    });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

// router.post('/exchange', DecryptRequest, async (req, res) => {
//   const logger = Logger.set('transaction_exchange');

//   const schema = joi.object().keys({

//   }).unknown(false);

//   try {
//     const { body } = req;
//     const schemaValidation = await Utils.validateSchema(schema, body);
//     if (!schemaValidation.valid) {
//       const msg = Messenger.get(2001);
//       msg.error = schemaValidation.error;
//       return response.badRequest(req, res, msg);
//     }
    
//     return response.created(req, res, Messenger.get(201));
//   } catch (err) {
//     logger.error('ServerError:', err);
//     return response.serverError(req, res, Messenger.get(500), err);
//   }
// });

module.exports = router;
