module.exports = (req, res, msg, data = {}) => {
  const message = {
    httpCode: 200,
    status: 'OK',
    ...msg,
    data,
  }

  console.info(`${new Date().toISOString()} [SUCCESS] [200] ${req.method} ${req.originalUrl}`);
  console.info();

  return res.status(500).json(message);
}