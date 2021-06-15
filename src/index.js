const env = require('./env');
const migrations = require('./migrations');
const refreshMatViews = require('./refresh-materialized-views');

if (!env.validateEnv()) {
  process.exit(1);
  return; // stop execution in tests
}

// todo usage

const syncEndpoints = async() => {
  const endpoints = [
    'contacts',
    'messages',
    'runs',
  ];

  for (const endpoint of endpoints) {
    await (require(`./endpoints/${endpoint}.js`)).sync();
  }
};

const run = async () => {
  await migrations.run();
  await syncEndpoints();
  await refreshMatViews.run();
};

run();
