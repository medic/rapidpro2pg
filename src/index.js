const env = require('./env');
const migrations = require('./migrations');
const refreshMatViews = require('./refresh-materialized-views');
const log = require('loglevel');

log.setDefaultLevel('info');

if (!env.validateEnv()) {
  process.exit(1);
  return; // stop execution in tests
}

if (process.argv.length > 2 && process.argv[2] === '--usage') {
  log.info(`
  USAGE
  
  export POSTGRESQL_URL=<PostgreSQL db URL>
  export RAPIDPRO_URL=<RapidPro instance URL>  
  export RAPIDPRO_AUTH=<RapidPro authentication token>
  rapidpro2pg
  `);
  process.exit(0);
}

const syncEndpoints = async() => {
  const endpoints = [
    'contacts',
    'messages',
    'runs',
    'flows',
  ];

  for (const endpoint of endpoints) {
    await (require(`./endpoints/${endpoint}.js`)).sync();
  }
};

const run = async () => {
  try {
    await migrations.run();
    await syncEndpoints();
    await refreshMatViews.run();
  } catch (err) {
    log.error('The synchronisation is aborted due to errors. Please check logs above.');
    process.exit(1);
  }
};

run();
