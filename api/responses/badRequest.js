module.exports = (req, res, msg) => {
  const message = {
    httpCode: 400,
    status: 'BAD REQUEST',
    ...msg,
  }

  console.error(`${new Date().toISOString()} [ERROR] [400] ${req.method} ${req.originalUrl}`);
  console.error();

  return res.status(400).json(message);
}