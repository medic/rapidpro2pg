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

const upsert = async (dbName, docs) => {
  let sql;
  try {
    const INSERT_STMT = `INSERT INTO ${dbName} (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc`;
    sql = format(INSERT_STMT, docs);
    await runSQL(sql);
  } catch (err) {
    log.error('Error while executing postgres query', err);
    throw err;
  }
};

module.exports = {
  upsert,
};
