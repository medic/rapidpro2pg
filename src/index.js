const log = require('loglevel');

const env = require('./env');
const migrations = require('./migrations');
const refreshMatViews = require('./refresh-materialized-views');

if (!env.validateEnv()) {
  process.exit(1);
}

// todo usage

const syncEndpoints = async() => {
  const endpoints = [
    'contacts',
    'messages',
    'runs',
  ];

  for (const endpoint in endpoints) {
    try {
      await (require(`./endpoints/${endpoint}.js`)).sync();
    } catch (err) {
      log.error(`Error when syncing ${endpoint} endpoint`, err);
      process.exit(1);
    }
  }
};

(async () => {
  await migrations.run(env.getPostgresUrl());
  await syncEndpoints();
  await refreshMatViews.run(env.getPostgresUrl());
})();
