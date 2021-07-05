const { Client } = require('pg');
const format = require('pg-format');
const log = require('loglevel');

const env = require('./env');

const runSQL = async (sql) => {
  const pg = new Client({ connectionString: env.getPostgresUrl() });
  try {
    await pg.connect();
    return await pg.query(sql);
  } finally {
    await pg.end();
  }
};

const query = async (stmt, ...args) => {
  let sql;
  try {
    sql = format(stmt, ...args);
    return runSQL(sql);
  } catch (err) {
    log.error('Error while executing postgres query', stmt, err);
    throw err;
  }
};

const upsert = async (insertStmt, docs) => {
  if (!docs.length) {
    return Promise.resolve();
  }

  return query(insertStmt, docs);
};

module.exports = {
  upsert,
  query,
};
