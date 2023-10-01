module.exports = (req, res, msg) => {
  const message = {
    httpCode: 403,
    status: 'FORBIDDEN',
    ...msg,
  }

  console.error(`${new Date().toISOString()} [ERROR] [403] ${req.method} ${req.originalUrl}`);
  console.error();

  return res.status(403).json(message);
}