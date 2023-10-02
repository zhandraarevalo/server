const { Messenger } = require('../services');
const { Session } = require('../models');
const response = require('../responses');
const MINUTES = 15;

module.exports = async (req, res, next) => {
  try {
    const sessionToken = req.headers['monarch-session'];
    const session = await Session.findOneBy(global.db, { where: { token: sessionToken }, populate: ['user'] });

    if (!session) {
      return response.badRequest(req, res, Messenger.get(1004));
    }

    const date = new Date().getTime();
    const tokenDate = new Date(session.updatedAt).getTime();
    const validTime = MINUTES * 60 * 1000;

    if (tokenDate + validTime < date) {
      await Session.deleteOne(global.db, session.id);
      return response.badRequest(req, res, Messenger.get(1003));
    }

    req.session = session;

    return next();
  } catch (err) {
    return response.serverError(req, res, Messenger.get(500), err);
  }
};
