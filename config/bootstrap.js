const { Logger } = require('../api/services');
const { Catalogue } = require('../api/models');

module.exports = async (db) => {
  const logger = Logger.set('bootstrap');

  try {
    const catalogueCount = await Catalogue.count(db);
    if (catalogueCount === 0) {
      for (const catalogue of serverData.catalogues) {
        await Catalogue.create(db, { obj: catalogue });
      }
    }
  } catch (err) {
    logger.error('ServerError:', err);
    throw err;
  }
};

const serverData = {
  catalogues: [
    { code: 'gender', tag: 'female' },
    { code: 'gender', tag: 'male' },
    { code: 'wallet_type', tag: 'balance' },
    { code: 'wallet_type', tag: 'saving' },
    { code: 'wallet_type', tag: 'reserve' },
    { code: 'wallet_type', tag: 'other' },
    { code: 'category_type', tag: 'expense' },
    { code: 'category_type', tag: 'income' },
    { code: 'category_type', tag: 'operation' },
    { code: 'category_type', tag: 'saving' },
    { code: 'transaction_type', tag: 'exchange' },
    { code: 'transaction_type', tag: 'payment' },
    { code: 'transaction_type', tag: 'transfer' },
    { code: 'payment_type', tag: 'entry' },
    { code: 'payment_type', tag: 'exit' },
  ]
}
