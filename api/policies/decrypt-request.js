const { Messenger, Security } = require('../services');
const response = require('../responses');

module.exports = async (req, res, next) => {
  try {
    const { token, data } = req.body;

    if (!token || !data) {
      return response.badRequest(req, res, Messenger.get(1001));
    }

    const key = await Security.decryptWithCert(token);
    req.body = await Security.decryptWithCipher(key, data);

    return next();
  } catch (err) {
    return response.serverError(req, res, Messenger.get(500), err);
  }
};
