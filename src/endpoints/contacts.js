const log = require('loglevel');

const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'contacts';
const DB_NAME = 'rapidpro_contacts';

module.exports = {
  sync: async () => {
    try {
      await defaultSync.sync(ENDPOINT_NAME, DB_NAME);
    } catch (err) {
      log.error('Error when syncing contacts', err);
      throw err;
    }
  },
};
