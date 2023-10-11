const { Messenger } = require('../services');
const { Session } = require('../models');
const response = require('../responses');

module.exports = async (req, res, next) => {
  try {
    const session = req.session;
    const nowDate = new Date().getTime() - (60 * 60 * 1000);
    await Session.update(global.db, session.id).set({ updatedAt: new Date(nowDate) });

    return next();
  } catch (err) {
    return response.serverError(req, res, Messenger.get(500), err);
  }
};
