module.exports = {
  get: (code) => {
    return {
      internalCode: code,
      userMessage: list[code],
    };
  }
}

const list = {
  200: 'OK',
  201: 'Created',
  400: 'BadRequest',
  404: 'NotFound',
  500: 'ServerError',

  2001: 'Invalid schema',
}
