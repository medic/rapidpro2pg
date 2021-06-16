const { Client } = require('pg');
const format = require('pg-format');
const log = require('loglevel');

const env = require('./env');

const runSQL = async (sql) => {
  const pg = new Client({ connectionString: env.getPostgresUrl() });
  await pg.connect();
  await pg.query(sql);
  await pg.end();
};

const upsert = async (insertStmt, docs) => {
  if (!docs.length) {
    return Promise.resolve();
  }

  let sql;
  try {
    sql = format(insertStmt, docs);
    await runSQL(sql);
  } catch (err) {
    log.error('Error while executing postgres query', insertStmt, err);
    throw err;
  }
};

module.exports = {
  upsert,
};
