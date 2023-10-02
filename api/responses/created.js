module.exports = (req, res, msg) => {
  const message = {
    httpCode: 201,
    status: 'CREATED',
    ...msg,
  }

  console.info(`${new Date().toISOString()} [SUCCESS] [201] [${message.internalCode}] ${req.method} ${req.originalUrl}`);
  console.info();

  return res.status(201).json(message);
}