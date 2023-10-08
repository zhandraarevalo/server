const joi = require('joi');
const express = require('express');
const router = express.Router();

const { Group } = require('../../models');
const { DecryptRequest } = require('../../policies');
const response = require('../../responses');
const { Logger, Messenger, Security, Utils } = require('../../services');

const groupSchema = joi.object().keys({
  name: joi.string().required(),
}).unknown(false);

router.get('/', async (req, res) => {
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

router.get('/:id', async (req, res) => {
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

router.post('/', DecryptRequest, async (req, res) => {
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

router.put('/:id', DecryptRequest, async (req, res) => {
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

module.exports = router;
