const Postgrator = require('postgrator');
const log = require('loglevel');

const run = async (postgresUrl) => {
  const migrator = new Postgrator({
    migrationDirectory: __dirname + '/refresh_matviews',
    driver: 'pg',
    connectionString: postgresUrl,
    schemaTable: 'rapidpro2pg_progress'
  });

  return migrator
    .migrate()
    .catch(err => {
      log.error('Error with refreshing materialized views', err);
      throw err;
    });
};

module.exports = {
  run,
};
