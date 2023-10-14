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

async function getBankStatement(req, res) {
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

    const date = new Date(body.year, body.month + 1, 0);
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
      const userCurrencies = await UserCurrency.find(global.db, {
        where: [{ field: 'user', operator: '=', value: user.id }],
        populate: [
          { field: 'currency', conditions: { limit: 1 } }
        ],
      });

      const backup = await Backup.find(global.db, {
        where: [
          { field: 'user', operator: '=', value: user.id },
        ],
        sort: [{ field: 'date', order: 'desc' }],
        populate: [{ field: 'wallet_backup', conditions: {
          populate: [{ field: 'wallet', conditions: {
            populate: [{ field: 'account', conditions: { limit: 1 } }],
            limit: 1,
          } }]
        } }],
        limit: 1,
      });

      for (const item of backup.walletBackupList) {
        const { wallet, ...walletBackup } = item;
        if (wallet) {
          const userCurrency = userCurrencies.find(item => item.id === wallet.account.currency);
          wallet.account.currency = userCurrency.currency;
          wallet.balance = walletBackup.balance;
          walletList.push(wallet);
        }
      }
    }

    return walletList;
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
}

router.post('/account-statement', DecryptRequest, async (req, res) => {
  const walletList = await getBankStatement(req, res);

  const msg = Messenger.get(200);
  const key = await Utils.generateToken(15);
  msg.data = await Security.encryptWithCipher(key, { walletList });
  msg.token = await Security.encryptWithCert({ key });
  return response.ok(req, res, msg);
});

router.post('/category-expenses', DecryptRequest, async (req, res) => {
  const logger = Logger.set('dashboard-category_expenses');
  
  try {
    const { user } = req.session;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(schema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const groupList = await Group.find(global.db, {
      where: [{ field: 'user', operator: '=', value: user.id }],
      sort: [{ field: 'name', order: 'asc' }],
      populate: [{
        field: 'category',
        conditions: {
          sort: [{ field: 'name', order: 'asc' }],
          populate: [{ 
            field: 'transaction'
          }, {
            field: 'budget',
            conditions: {
              sort: [{ field: 'createdAt', order: 'desc' }],
              limit: 1,
            }
          }, {
            field: 'category_backup',
            conditions: {
              sort: [{ field: 'createdAt', order: 'desc' }],
              limit: 1,
            }
          }]
        }
      }]
    });

    const categoryList = [];
    for (const groupItem of groupList) {
      const { categoryList: categories, ...group } = groupItem;

      for (const categoryItem of categories) {
        const category = {
          group: group.name,
          category: categoryItem.name,
          type: categoryItem.type,
          budget: categoryItem.budget.amount,
          accumulated: categoryItem.accumulates ? categoryItem.categoryBackup.accumulated : null,
          spent: 0,
        }

        for (const transaction of categoryItem.transactionList) {
          category.spent += transaction.totalAmount;
        }

        categoryList.push(category);
      }
    }

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { categoryList });
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
    
    const mainCurrency = await UserCurrency.find(global.db, {
      where: [
        { field: 'user', operator: '=', value: user.id },
        { field: 'main', operator: '=', value: true },
      ],
      populate: [{ field: 'currency', conditions: { limit: 1 }}],
      limit: 1,
    });
    const needWallets = ['saving', 'reserve'];
    const walletList = (await getBankStatement(req, res)).filter(item => {
      if (item.account.currency.id !== mainCurrency.currency.id) {
        return false;
      }

      return needWallets.includes(item.type);
    });

    for (const wallet of walletList) {
      boxTotal[wallet.type] += wallet.balance;
    }

    for (const category of categoryList) {
      for (const transaction of category.transactionList) {
        if (transaction.type === 'payment') {
          boxTotal[category.type] += transaction.totalAmount;
        } else if (transaction.type === 'transfer') {
          for (const payment of transaction.paymentList) {
            const operation = payment.type === 'entry' ? 1 : -1;
            const amount = operation * payment.amount;
            
            const wallet = await Wallet.find(global.db, { where: [{ field: 'id', operator: '=', value: payment.wallet }] });
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
