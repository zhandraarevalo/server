const { setModel } = require('./model');

module.exports = {
  Catalogue: setModel('catalogue'),
  Currency: setModel('currency'),
  Module: setModel('module'),
  Role: setModel('role'),
  RoleModule: setModel('role_module'),
  User: setModel('user'),
};
