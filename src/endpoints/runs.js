const log = require('loglevel');

const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'runs';
const INSERT_STMT =
        'INSERT INTO rapidpro_runs (uuid, doc) VALUES %L ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';

module.exports = {
  sync: async () => {
    try {
      await defaultSync.sync(ENDPOINT_NAME, INSERT_STMT);
    } catch (err) {
      log.error('error when syncing runs', err);
      throw err;
    }
  },
};
