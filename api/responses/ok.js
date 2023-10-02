module.exports = (req, res, msg) => {
  const message = {
    httpCode: 200,
    status: 'OK',
    ...msg,
  }

  console.info(`${new Date().toISOString()} [SUCCESS] [200] [${message.internalCode}] ${req.method} ${req.originalUrl}`);
  console.info();

  return res.status(200).json(message);
}