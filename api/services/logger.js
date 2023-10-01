const getError = (err) => {
  return err.message || err;
}

const circularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  }
}

module.exports = {
  getError,
  circularReplacer,
  set: (location) => {
    return {
      debug: (msg, obj) => {
        console.debug(`${new Date().toISOString()} [${location.toUpperCase()}] [DEBUG] ${msg}`, JSON.stringify(obj, circularReplacer()));
      },
      info: (msg) => {
        console.info(`${new Date().toISOString()} [${location.toUpperCase()}] [INFO] ${msg}`);
      },
      error: (msg, error = null) => {
        console.error(`${new Date().toISOString()} [${location.toUpperCase()}] [ERROR] ${msg}`, error ? JSON.stringify(getError(error), circularReplacer()) : null);
      }
    }
  }
};
