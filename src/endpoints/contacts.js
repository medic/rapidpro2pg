const log = require('loglevel');

const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'contacts';
const INSERT_STMT = 'INSERT INTO rapidpro_contacts (uuid, doc) VALUES %L ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';

module.exports = {
  sync: async () => {
    try {
      await defaultSync.sync(ENDPOINT_NAME, INSERT_STMT);
    } catch (err) {
      log.error('Error when syncing contacts', err);
      throw err;
    }
  },
};
