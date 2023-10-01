var { snakeKeys } = require('js-convert-case');

async function create(table, db, data) {
  try {
    const { obj, fetch } = data;

    const fields = [];
    const values = [];
    const snakeObj = snakeKeys(obj);

    for (const key in snakeObj) {
      fields.push(key);
      values.push(snakeObj[key]);
    }

    const id = await db.insert(`insert into ${table}(${fields.join(', ')}) value (${new Array(fields.length).fill('?').join(', ')})`, values);

    if (fetch) {
      return await findOne(db, table, { id });
    }
  } catch (err) {
    console.log('DatabaseError:', err);
    throw err;
  }
}

async function findAll(table, db) {
  try {
    return await db.getall(`select * from ${table}`);
  } catch (err) {
    console.log('DatabaseError:', err);
    throw err;
  }
}

async function findOne(table, db, data) {
  try {
    const { id, populate } = data;
    const value = await db.getrow(`select * from ${table} where id = ?`, [id]);

    if (populate.length > 0) {
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

      for (const name of populate) {
        const model = require(`./${name}`);
        const oneRelation = oneRelationList.find((e) => e.COLUMN_NAME === name);
        const manyRelation = manyRelationList.find((e) => e.TABLE_NAME === name);

        if (oneRelation) {
          value[name] = await model.findOne(db, value[name]);
        } else if (manyRelation) {
          console.log(manyRelation);
          const test = { [manyRelation['COLUMN_NAME']]: value.id };
          console.log(test);
          value[`${name}List`] = await model.findBy(db, test);
        }
      }
    }

    return value;
  } catch (err) {
    console.log('DatabaseError:', err);
    throw err;
  }
}

async function findBy(table, db, data) {
  try {
    const { where } = data;

    const conditions = [];
    const values = [];

    for (const key in where) {
      conditions.push(`${key} = ?`);
      values.push(where[key]);
    }

    return await db.getall(`select * from ${table} where ${conditions.join(' and ')}`, values);
  } catch (err) {
    console.log('DatabaseError:', err);
    throw err;
  }
}

function update(table, db, id) {
  return {
    set: async (data) => {
      try {
        const edit = [];
        const values = [];
  
        for (const key in data) {
          edit.push(`${key} = ?`);
          values.push(data[key]);
        }
  
        await db.update(`update ${table} set ${edit.join(', ')} where id = ?`, [...values, id]);
      } catch (err) {
        console.log('DatabaseError:', err);
        throw err;
      }
    }
  }
}

async function count(table, db) {
  try {
    return await db.getval(`SELECT count(id) FROM ${table}`);
  } catch (err) {
    console.log('DatabaseError:', err);
    throw err;
  }
}

function setModel(table) {
  return {
    create: (db, data) => create(table, db, data),
    findAll: (db) => findAll(table, db),
    findOne: (db, data) => findOne(table, db, data),
    findBy: (db, data) => findBy(table, db, data),
    update: (db, id) => update(table, db, id),
    count: (db) => count(table, db),
  };
}

module.exports = { setModel };
