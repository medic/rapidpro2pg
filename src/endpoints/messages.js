const log = require('loglevel');

const utils = require('./utils');
const pgUtils = require('../pg-utils');

const ENDPOINT_NAME = 'messages';
const UPSERT_ST = `INSERT INTO rapidpro_messages (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc`;

const upsert = (results) => {
  const records = results.map(result => ([ result.id, JSON.stringify(result) ]));
  return pgUtils.upsert(UPSERT_ST, records);
};


module.exports = {
  sync: async () => {
    try {
      await utils.sync(ENDPOINT_NAME, upsert);
    } catch (err) {
      log.error('Error when syncing messages', err);
      throw err;
    }
  },
};
