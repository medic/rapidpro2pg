const Postgrator = require('postgrator');
const log = require('loglevel');

const env = require('./env');

const run = async () => {
  log.info('Starting refreshing materialized views');
  const postgresUrl = env.getPostgresUrl();
  const migrator = new Postgrator({
    migrationDirectory: __dirname + '/refresh_matviews',
    driver: 'pg',
    connectionString: postgresUrl,
    schemaTable: 'rapidpro2pg_progress'
  });

  try {
    return await migrator.migrate();
  } catch (err) {
    log.error('Error with migrations', err);
    throw err;
  }
};

module.exports = {
  run,
};
