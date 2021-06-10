const Postgrator = require('postgrator');

const run = (postgresUrl) => {
  const migrator = new Postgrator({
    migrationDirectory: __dirname + '/migrations',
    driver: 'pg',
    connectionString: postgresUrl,
    schemaTable: 'rapidpro2pg_migrations'
  });

  return migrator.migrate().then(console.log).catch(console.error);
};

module.exports = {
  run,
};
