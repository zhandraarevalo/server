const joi = require('joi');
const express = require('express');
const router = express.Router();

const { Backup, Budget, Category, CategoryBackup, Group } = require('../../models');
const { DecryptRequest } = require('../../policies');
const response = require('../../responses');
const { Logger, Messenger, Security, Utils } = require('../../services');

const categorySchema = joi.object().keys({
  group: joi.number().integer().required(),
  type: joi.string().required(),
  name: joi.string().required(),
  accumulates: joi.boolean().required(),
  budget: joi.number().integer().required(),
}).unknown(false);

router.get('/', async (req, res) => {
  const logger = Logger.set('category_get');
  
  try {
    const { user } = req.session;

    const groupList = await Group.find(global.db, {
      where: [{ field: 'user', operator: '=', value: user.id }],
      sort: [{ field: 'name', order: 'asc'}],
    });
    
    const categoryList = [];
    if (groupList.length > 0) {
      const groupIds = groupList.map((item) => item.id);
      const categories = await Category.find(global.db, {
        isIn: [{ field: 'group', arr: groupIds }],
        populate: [{ field: 'budget', conditions: { sort: [{ field: 'createdAt', order: 'desc' }], limit: 1 } }],
      });
      
      for (const group of groupList) {
        const groupCategories = categories.filter((item) => item.group === group.id).sort(Utils.sortAscByName);
  
        for (const category of groupCategories) {
          category.group = group;
          categoryList.push(category);
        }
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

router.get('/:id', async (req, res) => {
  const logger = Logger.set('category_get_one');
  
  try {
    const { id } = req.params;
    const category = await Category.find(global.db, {
      where: [{ field: 'id', operator: '=', value: id }],
      populate: [
        { field: 'group', conditions: { limit: 1 } },
        { field: 'budget', conditions: { sort: [{ field: 'createdAt', order: 'desc' }], limit: 1 } },
      ],
      limit: 1,
    });
    
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

router.post('/', DecryptRequest, async (req, res) => {
  const logger = Logger.set('category_post');
  
  try {
    const { user } = req.session;
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(categorySchema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const { budget, ...categoryData } = body;
    const date = new Date();
    const backupDate = Utils.formatInputDate(new Date(date.getFullYear(), date.getMonth(), 0));

    await global.db.transaction(async (db) => {
      const backup = await Backup.find(db, {
        where: [
          { field: 'date', operator: '=', value: backupDate },
          { field: 'user', operator: '=', value: user.id },
        ],
        limit: 1,
      });

      const category = await Category.create(db, { obj: categoryData, fetch: true });
      await Budget.create(db, { obj: { amount: budget, category: category.id } });
      await CategoryBackup.create(db, { obj: {
        spent: 0,
        accumulated: category.accumulates ? 0 : null,
        category: category.id,
        backup: backup.id,
      }});
      return response.ok(req, res, Messenger.get(200));
    });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.post('/budget', DecryptRequest, async (req, res) => {
  const logger = Logger.set('category_budget');

  const schema = joi.object().keys({
    budget: joi.array().items(joi.object().keys({
      id: joi.number().integer().required().allow(null),
      group: joi.number().integer().required(),
      name: joi.string().required(),
      type: joi.string().required(),
      accumulates: joi.boolean().required(),
      amount: joi.number().integer().required(),
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

    const { budget, ...categoryData } = body;
    const date = new Date();
    const backupDate = Utils.formatInputDate(new Date(date.getFullYear(), date.getMonth(), 0));
    
    const backup = await Backup.find(global.db, {
      where: [
        { field: 'date', operator: '=', value: backupDate },
        { field: 'user', operator: '=', value: user.id },
      ],
      limit: 1,
    });
    
    await global.db.transaction(async (db) => {
      for (const item of body.budget) {
        const { id, amount, ...data } = item;
        if (id) {
          await Category.update(db, id).set(data);
          const budget = await Budget.find(db, {
            where: [{ field: 'category', operator: '=', value: id }],
            sort: [{ field: 'createdAt', order: 'desc' }],
            limit: 1,
          });
          if (budget.amount !== amount) {
            await Budget.update(db, budget.id).set({ amount });
          }
        } else {
          const category = await Category.create(db, { obj: data, fetch: true });
          await Budget.create(db, { obj: { amount, category: category.id } });
          await CategoryBackup.create(db, { obj: {
            spent: 0,
            accumulated: category.accumulates ? 0 : null,
            category: category.id,
            backup: backup.id,
          }});
        }
      }

      return response.created(req, res, Messenger.get(201));
    });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.put('/:id', DecryptRequest, async (req, res) => {
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
    
    const category = await Category.find(global.db, {
      where: [{ field: 'id', operator: '=', value: id }],
      populate: [{ field: 'budget', conditions: { sort: [{ field: 'createdAt', order: 'desc' }], limit: 1 } }],
      limit: 1,
    });

    for (const key in category) {
      if (category[key] !== categoryData[key]) {
        equal = false;
      }
    }

    await global.db.transaction(async (db) => {
      if (!equal) {
        await Category.update(db, id).set(categoryData);
      }
  
      if (category.budget.amount !== amount) {
        await Budget.create(db, { obj: { amount, category: category.id } });
      }
      
      return response.ok(req, res, Messenger.get(200));
    });
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

module.exports = router;
