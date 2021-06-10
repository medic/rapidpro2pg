const Postgrator = require('postgrator');

const run = async (postgresUrl) => {
  const migrator = new Postgrator({
    migrationDirectory: __dirname + '/refresh_matviews',
    driver: 'pg',
    connectionString: postgresUrl,
    schemaTable: 'rapidpro2pg_progress'
  });

  return migrator.migrate().then(console.log).catch(console.error);
};

module.exports = {
  run,
};
