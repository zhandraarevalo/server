const express = require('express');
const router = express.Router();

const response = require('../responses');
const { RoleModule, Session, User } = require('../models');
const { Authenticated, DecryptRequest, NotAuthenticated } = require('../policies');
const { Logger, Messenger, Security, Utils } = require('../services');

const joi = require('joi');
const schema = joi.object().keys({
  email: joi.string().email().required(),
  googleId: joi.string().required(),
});

router.post('/sign-in', NotAuthenticated, DecryptRequest, async (req, res) => {
  const logger = Logger.set('sign-in');

  try {
    const { body } = req;
    const schemaValidation = await Utils.validateSchema(schema, body);
    if (!schemaValidation.valid) {
      const msg = Messenger.get(2001);
      msg.error = schemaValidation.error;
      return response.badRequest(req, res, msg);
    }

    const user = await User.findOneBy(global.db, { where: body });
    if (!user) {
      return response.badRequest(req, res, Messenger.get(3001));
    }

    if (!user.active) {
      return response.badRequest(req, res, Messenger.get(3002));
    }

    const roleModules = await RoleModule.findBy(global.db, { where: { role: user.role }, populate: ['module'] });
    const modules = roleModules.map((obj) => obj.module);

    const sessionToken = await Security.encryptWithCert({ email: user.email });
    await Session.create(global.db, { obj: { token: sessionToken, user: user.id } });
    
    const msg = Messenger.get(200);
    const key = await Utils.generateToken(15);
    msg.data = await Security.encryptWithCipher(key, { modules, sessionToken });
    msg.token = await Security.encryptWithCert({ key });

    return response.ok(req, res, msg);
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

router.get('/sign-out', Authenticated, async (req, res) => {
  const logger = Logger.set('sign-out');
  
  try {
    const session = req.session;
    await Session.deleteOne(global.db, session.id);
    return response.ok(req, res, Messenger.get(200));
  } catch (err) {
    logger.error('ServerError:', err);
    return response.serverError(req, res, Messenger.get(500), err);
  }
});

module.exports = router;