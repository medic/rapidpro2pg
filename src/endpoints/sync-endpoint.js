const log = require('loglevel');

const rapidProUtils = require('../rapidpro-utils');
const pgUtils = require('../pg-utils');

const sync = async (endpointName, dbName) => {
  let url = rapidProUtils.getApiUri(endpointName);
  let total = 0;
  while (url) {
    const result = await rapidProUtils.get(url);
    const results = result.results;

    log.debug(`fetched ${results.length} ${endpointName}`);
    total += results.length;

    await upsert(dbName, results);
    url = result.next;
  }

  log.info(`Completed synchronizing ${total} messages`);
};

const upsert = (dbName, results) => {
  const records = results.map(result => ([ result.uuid, JSON.stringify(result) ]));
  return pgUtils.upsert(dbName, records);
};

module.exports = {
  sync,
};
