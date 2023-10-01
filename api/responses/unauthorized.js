module.exports = (req, res, msg) => {
  const message = {
    httpCode: 401,
    status: 'UNAUTHORIZED',
    ...msg,
  }

  console.error(`${new Date().toISOString()} [ERROR] [401] ${req.method} ${req.originalUrl}`);
  console.error();

  return res.status(401).json(message);
}