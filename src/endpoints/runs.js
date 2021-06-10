const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'runs';
const DB_NAME = 'rapidpro_runs';

module.exports = {
  sync: defaultSync.sync(ENDPOINT_NAME, DB_NAME),
};
