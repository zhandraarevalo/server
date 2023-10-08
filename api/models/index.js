const { setModel } = require('./model');

module.exports = {
  Account: setModel('account'),
  Backup: setModel('backup'),
  Budget: setModel('budget'),
  Catalogue: setModel('catalogue'),
  Category: setModel('category'),
  CategoryBackup: setModel('category_backup'),
  Currency: setModel('currency'),
  ExchangeRate: setModel('exchange_rate'),
  Group: setModel('group'),
  Module: setModel('module'),
  Role: setModel('role'),
  RoleModule: setModel('role_module'),
  Session: setModel('session'),
  User: setModel('user'),
  UserCurrency: setModel('user_currency'),
  Wallet: setModel('wallet'),
  WalletBackup: setModel('wallet_backup'),
};
