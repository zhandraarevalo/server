const { Messenger } = require('../services');
const response = require('../responses');

module.exports = async (req, res, next) => {
  try {
    const user = req.session?.user;

    if (user) {
      return response.badRequest(req, res, Messenger.get(1002));
    }

    return next();
  } catch (err) {
    return response.serverError(req, res, Messenger.get(500), err);
  }
};
