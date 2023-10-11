var { snakeKeys, camelKeys, toSnakeCase } = require('js-convert-case');
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

async function setRelation(obj, name, conditions, oneRelation, manyRelation) {
  const localConditions = { ...conditions };

  if (!localConditions.where) {
    localConditions.where = [];
  }

  if (oneRelation) {
    const model = setModel(oneRelation.REFERENCED_TABLE_NAME);
    localConditions.where.push({ field: 'id', operator: '=', value: obj[name] });
    obj[name] = await model.find(db, localConditions);
  } else if (manyRelation) {
    const model = setModel(manyRelation.TABLE_NAME);
    localConditions.where.push({ field: manyRelation['COLUMN_NAME'], operator: '=', value: obj.id });
    let fieldName = localConditions.limit === 1 ? name : `${name}List`;
    obj[fieldName] = await model.find(db, localConditions);
  }

  return obj;
}

async function colonize(table, populate, objs) {
  const { oneRelationList, manyRelationList } = await getRelations(table);
  
  for (const item of populate) {
    const oneRelation = oneRelationList.find((e) => e.COLUMN_NAME === item.field);
    const manyRelation = manyRelationList.find((e) => e.TABLE_NAME === item.field);
    const itemWhere = { where: item.conditions?.where };
    
    for (let value of objs) {
      const itemConditions = { ...item.conditions };
      itemConditions.where = itemWhere.where ? [ ...itemWhere.where ] : undefined;
      value = await setRelation(value, item.field, { ...itemConditions } || {}, oneRelation, manyRelation);
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
      return await find(table, db, { where: [{ field: 'id', operator: '=', value: id }], limit: 1 });
    }
  } catch (err) {
    logger.error('DatabaseError:', err);
    throw err;
  }
}

async function find(table, db, data = {}) {
  const logger = Logger.set(`${table}-find`);
  try {
    let query = `select * from \`${table}\``;

    const {
      where = [],
      isIn = [],
      between = [],
      sort = [],
      populate = [],
      limit = null,
    } = data;

    const whereConditions = [];
    const binds = [];
    if (where.length > 0 || isIn.length > 0 || between.length > 0) {

      if (where.length > 0) {
        for (const item of where) {
          whereConditions.push(`\`${toSnakeCase(item.field)}\` ${item.operator} ?`);
          binds.push(item.value);
        }
      }

      if (isIn.length > 0) {
        for (const item of isIn) {
          whereConditions.push(`\`${toSnakeCase(item.field)}\` in (${new Array(item.arr.length).fill('?').join(', ')})`);
          binds.push(...item.arr);
        }
      }

      if (between.length > 0) {
        for (const item of between) {
          whereConditions.push(`\`${toSnakeCase(item.field)}\` between ? and ?`);
          binds.push(item.since);
          values.push(item.until);
        }
      }
      
      query += ` where ${whereConditions.join(' and ')}`;
    }

    if (sort.length > 0) {
      const sortConditions = [];
      for (const item of sort) {
        sortConditions.push(`\`${toSnakeCase(item.field)}\` ${item.order}`);
      }
      query += ` order by ${sortConditions.join(', ')}`;
    }

    if (limit) {
      query += ` limit ${limit}`;
    }

    let values = await db.getall(query, binds);

    if (values.length > 0 && populate.length > 0) {
      values = await colonize(table, [...populate], values);
    }

    if (limit === 1) {
      return camelKeys(values[0]);
    }

    return values.map((value) => camelKeys(value));
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
    find: (db, data) => find(table, db, data),
    update: (db, id) => update(table, db, id),
    count: (db) => count(table, db),
    deleteOne: (db, id) => deleteOne(table, db, id),
  };
}

module.exports = { setModel };
