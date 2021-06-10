const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'messages';
const DB_NAME = 'rapidpro_messages';

module.exports = {
  sync: defaultSync.sync(ENDPOINT_NAME, DB_NAME),
};
