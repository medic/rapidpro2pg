const log = require('loglevel');

const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'messages';
const DB_NAME = 'rapidpro_messages';

module.exports = {
  sync: async () => {
    try {
      await defaultSync.sync(ENDPOINT_NAME, DB_NAME);
    } catch (err) {
      log.error('Error when syncing messages', err);
      throw err;
    }
  },
};
