var { snakeKeys, camelKeys } = require('js-convert-case');
const { Logger } = require('../services');

async function getRelations(table) {
  const oneRelationList = await db.query(`
    select COLUMN_NAME, REFERENCED_TABLE_NAME
    from information_schema.KEY_COLUMN_USAGE
    where REFERENCED_COLUMN_NAME = 'id'
      and TABLE_NAME = '${table}'
  `);

  const manyRelationList = await db.query(`
    select COLUMN_NAME, TABLE_NAME
    from information_schema.KEY_COLUMN_USAGE
    where REFERENCED_COLUMN_NAME = 'id'
      and REFERENCED_TABLE_NAME = '${table}'
  `);

  return { oneRelationList, manyRelationList}
}

async function setRelation(value, name, oneRelation, manyRelation) {
  if (oneRelation) {
    const model = setModel(oneRelation.REFERENCED_TABLE_NAME);
    value[name] = await model.findOne(db, { id: value[name] });
  } else if (manyRelation) {
    const model = setModel(manyRelation.TABLE_NAME);
    const manyWhere = { [manyRelation['COLUMN_NAME']]: value.id };
    value[`${name}List`] = await model.findBy(db, { where: manyWhere });
  }

  return value;
}

async function colonize(table, populate, objs) {
  const { oneRelationList, manyRelationList } = await getRelations(table);

  for (const name of populate) {
    const oneRelation = oneRelationList.find((e) => e.COLUMN_NAME === name);
    const manyRelation = manyRelationList.find((e) => e.TABLE_NAME === name);

    for (let value of objs) {
      value = await setRelation(value, name, oneRelation, manyRelation);
    }
  }

  return objs;
}

async function create(table, db, data) {
  const logger = Logger.set(`${table}-create`);
  try {
    const { obj, fetch } = data;

    const fields = [];
    const values = [];
    const snakeObj = snakeKeys(obj);

    for (const key in snakeObj) {
      fields.push(`\`${key}\``);
      values.push(snakeObj[key]);
    }

    const id = await db.insert(`insert into \`${table}\`(${fields.join(', ')}) value (${new Array(fields.length).fill('?').join(', ')})`, values);

    if (fetch) {
      return await findOne(table, db, { id });
    }
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

async function findAll(table, db) {
  const logger = Logger.set(`${table}-find_all`);
  try {
    const objs = await db.getall(`select * from \`${table}\``);
    return objs.map(obj => camelKeys(obj));
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

async function findOne(table, db, data) {
  const logger = Logger.set(`${table}-find_one`);
  try {
    const { id, populate = [] } = data;
    let value = await db.getrow(`select * from \`${table}\` where id = ?`, [id]);

    if (value && populate.length > 0) {
      [ value ] = await colonize(table, populate, [ value ]);
    }

    return value ? camelKeys(value) : null;
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

async function findOneBy(table, db, data) {
  const logger = Logger.set(`${table}-find_one_by`);
  try {
    const { where, populate = [] } = data;

    const conditions = [];
    const values = [];

    const whereObj = snakeKeys(where);
    for (const key in whereObj) {
      conditions.push(`\`${key}\` = ?`);
      values.push(whereObj[key]);
    }

    let value = await db.getrow(`select * from \`${table}\` where ${conditions.join(' and ')}`, values);

    if (value && populate.length > 0) {
      [ value ] = await colonize(table, populate, [ value ]);
    }

    return value ? camelKeys(value) : null;
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

async function findBy(table, db, data) {
  const logger = Logger.set(`${table}-find_by`);
  try {
    const { where, populate = [] } = data;

    const conditions = [];
    const values = [];

    const whereObj = snakeKeys(where);
    for (const key in whereObj) {
      conditions.push(`\`${key}\` = ?`);
      values.push(whereObj[key]);
    }

    let objs = await db.getall(`select * from \`${table}\` where ${conditions.join(' and ')}`, values);
    if (objs.length > 0 && populate.length > 0) {
      objs = await colonize(table, populate, objs);
    }

    return objs.map(obj => camelKeys(obj));
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

async function findIn(table, db, data) {
  const logger = Logger.set(`${table}-find_in`);
  try {
    const { arr, field, populate = [] } = data;

    let objs = await db.getall(`select * from \`${table}\` where \`${field}\` in (${new Array(arr.length).fill('?').join(', ')})`, arr);

    if (populate.length > 0) {
      objs = await colonize(table, populate, objs);
    }

    return objs.map(obj => camelKeys(obj));
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

function update(table, db, id) {
  const logger = Logger.set(`${table}-update`);
  return {
    set: async (data) => {
      try {
        const edit = [];
        const values = [];

        const snakeObj = snakeKeys(data);
  
        for (const key in snakeObj) {
          edit.push(`\`${key}\` = ?`);
          values.push(snakeObj[key]);
        }
  
        await db.update(`update \`${table}\` set ${edit.join(', ')} where id = ?`, [...values, id]);
      } catch (err) {
        logger.error('DatabaseError:', err);
        throw err;
      }
    }
  }
}

async function count(table, db) {
  const logger = Logger.set(`${table}-count`);
  try {
    return await db.getval(`SELECT count(id) FROM \`${table}\``);
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

async function deleteOne(table, db, id) {
  const logger = Logger.set(`${table}-delete_one`);
  try {
    await db.execute(`delete from \`${table}\` where id = ?`, [id]);
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

function setModel(table) {
  return {
    create: (db, data) => create(table, db, data),
    findAll: (db) => findAll(table, db),
    findOne: (db, data) => findOne(table, db, data),
    findOneBy: (db, data) => findOneBy(table, db, data),
    findBy: (db, data) => findBy(table, db, data),
    findIn: (db, data) => findIn(table, db, data),
    update: (db, id) => update(table, db, id),
    count: (db) => count(table, db),
    deleteOne: (db, id) => deleteOne(table, db, id),
  };
}

module.exports = { setModel };
