const log = require('loglevel');

const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'runs';
const DB_NAME = 'rapidpro_runs';

module.exports = {
  sync: async () => {
    try {
      await defaultSync.sync(ENDPOINT_NAME, DB_NAME);
    } catch (err) {
      log.error('error when syncing runs', err);
      throw err;
    }
  },
};
