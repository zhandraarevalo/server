const joi = require('joi');
const express = require('express');
const router = express.Router();

const { Backup, Group, UserCurrency, Wallet } = require('../../models');
const { DecryptRequest } = require('../../policies');
const response = require('../../responses');
const { Logger, Messenger, Security, Utils } = require('../../services');

const schema = joi.object().keys({
  year: joi.number().integer().required(),
  month: joi.number().integer().required(),
}).unknown(false);

router.post('/account-statement', DecryptRequest, async (req, res) => {
  const logger = Logger.set('dashboard-account_statement');

  try {
    const { user } = req.session;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(schema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const date = new Date(body.year, body.month, 0);
    // const date = new Date(body.year, body.month + 1, 0);
    const nowDate = new Date();

    const walletList = [];
    if (nowDate < date) {
      const userCurrencies = await UserCurrency.find(global.db, {
        where: [{ field: 'user', operator: '=', value: user.id }],
        populate: [
          {
            field: 'account',
            conditions: { populate: [{
              field: 'wallet',
              conditions: {
                sort: [{ field: 'name', order: 'asc' }]
              }
            }] },
          },
          { field: 'currency', conditions: { limit: 1 } }
        ],
      });
  
      const accountList = userCurrencies.map(item => {
        for (const uc of item.accountList) {
          uc.currency = item.currency;
        }
        return item.accountList;
      }).flat().sort(Utils.sortAscByName);
  
      for (const accountItem of accountList) {
        const { walletList: wallets, ...account } = accountItem;
        for (const item of wallets) {
          item.account = account;
          walletList.push(item);
        }
      }
    } else {
      const backup = await Backup.find(global.db, {
        where: [{ field: 'user', operator: '=', value: user.id }]
      });
      console.log(backup);
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

router.post('/box-budget', DecryptRequest, async (req, res) => {
  const logger = Logger.set('dashboard-box_budget');

  try {
    const { user } = req.session;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(schema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const date = Utils.formatInputDate(new Date(body.year, body.month + 1, 0));

    const groupList = await Group.find(global.db, {
      where: [{ field: 'user', operator: '=', value: user.id }],
      populate: [{ field: 'category', conditions: {
        where: [{ field: 'type', operator: '!=', value: 'operation' }],
        populate: [{
          field: 'budget',
          conditions: {
            where: [{ field: 'createdAt', operator: '<=', value: date }],
            sort: [{ field: 'createdAt', order: 'desc' }],
            limit: 1,
          }
        }],
      }}]
    });
    const categoryList = groupList.reduce((p, v) => [...p, ...v.categoryList], []);

    const boxBudget = { expense: 0, income: 0, saving: 0, reserve: 0 };
    for (const category of categoryList) {
      boxBudget[category.type] += category.budget.amount;

      if (category.accumulates) {
        boxBudget.reserve += category.budget.amount;
      }
    }

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { boxBudget });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.post('/box-total', DecryptRequest, async (req, res) => {
  const logger = Logger.set('dashboard-box_total');

  try {
    const { user } = req.session;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(schema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const dateSince = Utils.formatInputDate(new Date(body.year, body.month, 0));
    const dateUntil = Utils.formatInputDate(new Date(body.year, body.month + 1, 0));

    const groupList = await Group.find(global.db, {
      where: [{ field: 'user', operator: '=', value: user.id }],
      populate: [{ field: 'category', conditions: {
        where: [{ field: 'type', operator: '!=', value: 'operation' }],
        populate: [{
          field: 'transaction',
          conditions: {
            where: [
              { field: 'date', operator: '>', value: dateSince },
              { field: 'date', operator: '<=', value: dateUntil },
            ],
            populate: [{ field: 'payment' }]
          }
        }],
      }}]
    });
    const categoryList = groupList.reduce((p, v) => [...p, ...v.categoryList], []);

    const boxTotal = { expense: 0, income: 0, saving: 0, reserve: 0 };
    for (const category of categoryList) {
      for (const transaction of category.transactionList) {
        if (transaction.type === 'payment') {
          boxTotal[category.type] += transaction.totalAmount;
        } else if (transaction.type === 'transfer') {
          for (const payment of transaction.paymentList) {
            const operation = payment.type === 'entry' ? 1 : -1;
            const amount = operation * payment.amount;
            
            const wallet = await Wallet.findOne(global.db, { id: payment.wallet });
            if (wallet.type === 'saving') {
              boxTotal.saving += amount;
            } else if (wallet.type === 'reserve') {
              boxTotal.reserve += amount;
            } else {
              boxTotal.expense += amount;
            }
          }
        } else if (transaction.type === 'exchange') {
          // pending
        }
      }
    }

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { boxTotal });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

module.exports = router;