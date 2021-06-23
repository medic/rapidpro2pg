const log = require('loglevel');

const rapidProUtils = require('../rapidpro-utils');

const sync = async (endpointName, upsert, queryString = '') => {
  let url = rapidProUtils.getApiUri(endpointName, queryString);
  let total = 0;
  while (url) {
    const result = await rapidProUtils.get(url);
    const results = result.results;

    log.debug(`fetched ${results.length} from ${endpointName}`);
    total += results.length;

    await upsert(results);
    url = result.next;
  }

  log.info(`Completed synchronizing ${total} ${endpointName}`);
};

module.exports = {
  sync,
};
