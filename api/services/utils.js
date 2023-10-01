module.exports = {
  validateSchema: async (schema, value) => {
    try {
      await schema.validateAsync(value);
      return { valid: true };
    } catch (err) {
      console.log('ServerError:', err);
      return { valid: false, error: error.details[0].message };
    }
  }
}
