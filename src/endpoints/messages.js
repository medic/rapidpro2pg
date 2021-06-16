const log = require('loglevel');

const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'messages';
const INSERT_STMT = 'INSERT INTO rapidpro_messages (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc';

module.exports = {
  sync: async () => {
    try {
      await defaultSync.sync(ENDPOINT_NAME, INSERT_STMT, 'id');
    } catch (err) {
      log.error('Error when syncing messages', err);
      throw err;
    }
  },
};
