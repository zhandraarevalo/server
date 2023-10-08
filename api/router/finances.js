const express = require('express');
const router = express.Router();

const account = express.Router();
const category = express.Router();
const currency = express.Router();
const group = express.Router();
const wallet = express.Router();

const joi = require('joi');

const response = require('../responses');
const {
  Account,
  Backup,
  Budget,
  Category,
  Currency,
  Group,
  UserCurrency,
  Wallet,
  WalletBackup,
} = require('../models');
const { DecryptRequest } = require('../policies');
const { Logger, Messenger, Security, Utils } = require('../services');

const accountSchema = joi.object().keys({
  name: joi.string().required(),
  currency: joi.number().integer().required(),
}).unknown(false);

const categorySchema = joi.object().keys({
  group: joi.number().integer().required(),
  type: joi.string().required(),
  name: joi.string().required(),
  accumulates: joi.boolean().required(),
  budget: joi.number().integer().required(),
}).unknown(false);

const groupSchema = joi.object().keys({
  name: joi.string().required(),
}).unknown(false);

const walletSchema = joi.object().keys({
  account: joi.number().integer().required(),
  type: joi.string().required(),
  name: joi.string().required(),
  balance: joi.number().integer().required(),
}).unknown(false);

account.get('/', async (req, res) => {
  const logger = Logger.set('account_get');

  try {
    const { user } = req.session;
    const userCurrencies = await UserCurrency.findBy(global.db, { where: { user: user.id }, populate: ['account', 'currency'] });

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

account.get('/:id', async (req, res) => {
  const logger = Logger.set('account_get_one');

  try {
    const { id } = req.params;

    const currencyList = await Currency.findAll(global.db);
    const account = await Account.findOne(global.db, { id, populate: ['currency'] });
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

account.post('/', DecryptRequest, async (req, res) => {
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

account.put('/:id', DecryptRequest, async (req, res) => {
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

category.get('/', async (req, res) => {
  const logger = Logger.set('category_get');
  
  try {
    const { user } = req.session;

    let groupList = await Group.findBy(global.db, { where: { user: user.id } });
    groupList = groupList.sort(Utils.sortAscByName);
    const groupIds = groupList.map((item) => item.id);
    const categories = await Category.findIn(global.db, { field: 'group', arr: groupIds, populate: ['budget']});
    
    const categoryList = [];
    for (const group of groupList) {
      const groupCategories = categories.filter((item) => item.group === group.id).sort(Utils.sortAscByName);

      for (const item of groupCategories) {
        const { budgetList, ...category } = item;
        const budget = budgetList.sort(Utils.sortDescByCreatedDate)[0];
        category.group = group;
        category.budget = budget;
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

category.get('/:id', async (req, res) => {
  const logger = Logger.set('category_get_one');
  
  try {
    const { id } = req.params;
    const categoryData = await Category.findOne(global.db, { id, populate: ['group', 'budget'] });
    const { budgetList, ...category } = categoryData;
    category.budget = budgetList.sort(Utils.sortDescByCreatedDate)[0];
    
    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { category });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

category.post('/', DecryptRequest, async (req, res) => {
  const logger = Logger.set('category_post');
  
  try {
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(categorySchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const { budget, ...categoryData } = body;

    await global.db.transaction(async (db) => {
      const category = await Category.create(db, { obj: categoryData, fetch: true });
      await Budget.create(db, { obj: { amount: budget, category: category.id } });
      return response.ok(req, res, Messenger.get(200));
    });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

category.put('/:id', DecryptRequest, async (req, res) => {
  const logger = Logger.set('category_put');
  
  try {
    const { id } = req.params;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(categorySchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    let equal = true;
    const { budget: amount, ...categoryData } = body;
    const foundCategory = await Category.findOne(global.db, { id, populate: ['budget'] });

    const { budgetList, ...category } = foundCategory;

    for (const key in category) {
      if (category[key] !== categoryData[key]) {
        equal = false;
      }
    }

    await global.db.transaction(async (db) => {
      if (!equal) {
        await Category.update(db, id).set(categoryData);
      }
  
      const budget = budgetList.sort(Utils.sortDescByCreatedDate)[0];
      if (budget.amount !== amount) {
        await Budget.create(db, { obj: { amount, category: category.id } });
      }
      
      return response.ok(req, res, Messenger.get(200));
    });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

currency.get('/', async (req, res) => {
  const logger = Logger.set('currency_get');

  try {
    const { user } = req.session;
    const currencyList = await UserCurrency.findBy(global.db, { where: { user: user.id }, populate: ['currency'] });

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

group.get('/', async (req, res) => {
  const logger = Logger.set('group_get');

  try {
    const { user } = req.session;
    let groupList = await Group.findBy(global.db, { where: { user: user.id } });
    groupList = groupList.sort(Utils.sortAscByName);

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { groupList });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

group.get('/:id', async (req, res) => {
  const logger = Logger.set('group_get_one');
  try {
    const { id } = req.params;
    const group = await Group.findOne(global.db, { id });

    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { group });
    msg.token = await Security.encryptWithCert({ key });
    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

group.post('/', DecryptRequest, async (req, res) => {
  const logger = Logger.set('group_post');

  try {
    const { user } = req.session;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(groupSchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }
    
    body.user = user.id;
    await Group.create(global.db, { obj: body });
    return response.created(req, res, Messenger.get(201));
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

group.put('/:id', DecryptRequest, async (req, res) => {
  const logger = Logger.set('group_put');

  try {
    const { id } = req.params;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(groupSchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    await Group.update(global.db, id).set(body);
    return response.ok(req, res, Messenger.get(200));
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

wallet.get('/', async (req, res) => {
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

wallet.get('/:id', async (req, res) => {
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

wallet.post('/', DecryptRequest, async (req, res) => {
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

wallet.put('/:id', DecryptRequest, async (req, res) => {
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

router.use('/account', account);
router.use('/category', category);
router.use('/currency', currency);
router.use('/group', group);
router.use('/wallet', wallet);

module.exports = router;
