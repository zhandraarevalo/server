const { Logger } = require('../api/services');
const {
  Catalogue,
  Module,
  Role,
  RoleModule,
} = require('../api/models');

module.exports = async (db) => {
  const logger = Logger.set('bootstrap');

  try {
    const catalogueCount = await Catalogue.count(db);
    if (catalogueCount === 0) {
      for (const catalogue of serverData.catalogues) {
        await Catalogue.create(db, { obj: catalogue });
      }
    }

    const moduleCount = await Module.count(db);
    if (moduleCount === 0) {
      for (const mod of serverData.modules) {
        await Module.create(db, { obj: mod });
      }
    }

    const roleCount = await Role.count(db);
    if (roleCount === 0) {
      for (const role of serverData.roles) {
        await Role.create(db, { obj: role });
      }
    }

    const rmCount = await RoleModule.count(db);
    if (rmCount === 0) {
      for (const rm of serverData.roleModules) {
        const role = await Role.findBy(db, { where: { tag: rm.role } });
        const module = await Module.findBy(db, { where: { tag: rm.module } });
        const obj = { role: role[0].id, module: module[0].id };
        await RoleModule.create(db, { obj });
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
  ],
  modules: [
    { sequence: -1, tag: 'admin', icon: 'admin_panel_settings', route: 'admin' },
    { sequence: 1, tag: 'dashboard', icon: 'monitoring', route: 'dashboard' },
    { sequence: 2, tag: 'finances', icon: 'monetization_on', route: 'finances' },
    { sequence: 3, tag: 'keeper', icon: 'lock', route: 'keeper' },
  ],
  roles: [
    { tag: 'admin' },
    { tag: 'user' },
  ],
  roleModules: [
    { role: 'admin', module: 'admin' },
    { role: 'admin', module: 'dashboard' },
    { role: 'admin', module: 'finances' },
    { role: 'admin', module: 'keeper' },
    { role: 'user', module: 'dashboard' },
    { role: 'user', module: 'finances' },
    { role: 'user', module: 'keeper' },
  ],
}
