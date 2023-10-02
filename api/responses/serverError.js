const { Logger } = require('../services');

module.exports = (req, res, msg, error = {}) => {
  const message = {
    httpCode: 500,
    status: 'SERVER ERROR',
    ...msg,
    error: JSON.stringify(Logger.getError(error), Logger.circularReplacer()),
  }

  console.error(`${new Date().toISOString()} [ERROR] [500] [${message.internalCode}] ${req.method} ${req.originalUrl}`);
  console.error();

  return res.status(500).json(message);
}