const { Messenger } = require('../services');
const { Session } = require('../models');
const response = require('../responses');
const MINUTES = 15;
const DIFFERENCE = 60 * 60 * 1000;

module.exports = async (req, res, next) => {
  try {
    const sessionToken = req.headers['monarch-session'];
    const session = await Session.find(global.db, {
      where: [{ field: 'token', operator: '=', value: sessionToken }],
      populate: [{ field: 'user', conditions: { limit: 1 } }],
      limit: 1,
    });

    if (!session) {
      return response.badRequest(req, res, Messenger.get(1004));
    }

    const date = new Date().getTime();
    const tokenDate = new Date(session.updatedAt).getTime() + DIFFERENCE;
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
