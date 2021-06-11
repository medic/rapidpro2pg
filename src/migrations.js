const Postgrator = require('postgrator');
const log = require('loglevel');

const run = (postgresUrl) => {
  const migrator = new Postgrator({
    migrationDirectory: __dirname + '/migrations',
    driver: 'pg',
    connectionString: postgresUrl,
    schemaTable: 'rapidpro2pg_migrations'
  });

  return migrator
    .migrate()
    .catch(err => {
      log.error('Error with migrations', err);
      throw err;
    });
};

module.exports = {
  run,
};