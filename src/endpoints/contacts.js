const defaultSync = require('./sync-endpoint');

const ENDPOINT_NAME = 'contacts';
const DB_NAME = 'rapidpro_contacts';

module.exports = {
  sync: defaultSync.sync(ENDPOINT_NAME, DB_NAME),
};
