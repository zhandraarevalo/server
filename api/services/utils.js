const Logger = require('./logger');

module.exports = {
  validateSchema: async (schema, value) => {
    const logger = Logger.set('validate_schema');
    try {
      await schema.validateAsync(value);
      return { valid: true };
    } catch (err) {
      logger.error('ServerError:', err);
      return { valid: false, error: error.details[0].message };
    }
  }
}
