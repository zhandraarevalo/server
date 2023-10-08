const df = require('date-format');
const rs = require('randomstring');
const Logger = require('./logger');

module.exports = {
  formatInputDate: (date) => {
    return df('yyyy-MM-dd', date);
  },
  generateToken: async (size) => {
    return rs.generate(size);
  },
  sortAscByName: (a, b) => {
    if (a.name < b.name) {
      return -1;
    }
    return 1;
  },
  sortDescByName: (a, b) => {
    if (a.name > b.name) {
      return -1;
    }
    return 1;
  },
  sortAscByCreatedDate: (a, b) => {
    if (a.createdAt < b.createdAt) {
      return -1;
    }
    return 1;
  },
  sortDescByCreatedDate: (a, b) => {
    if (a.createdAt > b.createdAt) {
      return -1;
    }
    return 1;
  },
  validateSchema: async (schema, value) => {
    const logger = Logger.set('validate_schema');
    try {
      await schema.validateAsync(value);
      return { valid: true };
    } catch (err) {
      logger.error('ServerError:', err);
      return { valid: false, error: err.details[0].message };
    }
  }
}
