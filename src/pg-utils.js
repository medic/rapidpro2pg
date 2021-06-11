const { Client } = require('pg');
const format = require('pg-format');

const env = require('./env');

const runSQL = async (sql) => {
  const pg = new Client({ connectionString: env.getPostgresUrl() });
  await pg.connect();
  await pg.query(sql);
  await pg.end();
};

const upsert = async (dbName, docs) => {
  const INSERT_STMT = `INSERT INTO ${dbName} (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc`;
  const sql = format(INSERT_STMT, docs);
  await runSQL(sql);
};

module.exports = {
  upsert,
};
