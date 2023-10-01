const { setModel } = require('./model');

module.exports = {
  Catalogue: setModel('catalogue'),
  Module: setModel('module'),
  Role: setModel('role'),
  RoleModule: setModel('role_module'),
};
