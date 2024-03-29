const Postgrator = require('postgrator');
const log = require('loglevel');

const env = require('./env');

const run = async () => {
  log.info('Starting migrations test');
  const postgresUrl = env.getPostgresUrl();
  const migrator = new Postgrator({
    migrationDirectory: __dirname + '/migrations',
    driver: 'pg',
    connectionString: postgresUrl,
    schemaTable: 'rapidpro2pg_migrations'
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
