const log = require('loglevel');

const rapidProUtils = require('../rapidpro-utils');
const pgUtils = require('../pg-utils');

const sync = async (endpointName, insertStmt, uniqueKey) => {
  let url = rapidProUtils.getApiUri(endpointName);
  let total = 0;
  while (url) {
    const result = await rapidProUtils.get(url);
    const results = result.results;

    log.debug(`fetched ${results.length} ${endpointName}`);
    total += results.length;

    await upsert(insertStmt, results, uniqueKey);
    url = result.next;
  }

  log.info(`Completed synchronizing ${total} messages`);
};

const upsert = (insertStmt, results, uniqueKey = 'uuid') => {
  const records = results.map(result => ([ result[uniqueKey], JSON.stringify(result) ]));
  return pgUtils.upsert(insertStmt, records);
};

module.exports = {
  sync,
};
