const { Messenger } = require('../services');
const { Session } = require('../models');
const response = require('../responses');

module.exports = async (req, res, next) => {
  try {
    const session = req.session;
    await Session.update(global.db, session.id).set({ updatedAt: new Date() });

    return next();
  } catch (err) {
    return response.serverError(req, res, Messenger.get(500), err);
  }
};
