const log = require('loglevel');

const utils = require('./utils');
const pgUtils = require('../pg-utils');

const ENDPOINT_NAME = 'contacts';
const UPSERT_ST =
        `INSERT INTO rapidpro_contacts (uuid, doc) VALUES %L ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc`;

const upsert = (results) => {
  const records = results.map(result => ([ result.uuid, JSON.stringify(result) ]));
  return pgUtils.upsert(UPSERT_ST, records);
};

module.exports = {
  sync: async () => {
    try {
      await utils.sync(ENDPOINT_NAME, upsert);
    } catch (err) {
      log.error('Error when syncing contacts', err);
      throw err;
    }
  },
};
