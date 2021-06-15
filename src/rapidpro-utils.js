const fetch = require('node-fetch');
const log = require('loglevel');

const env = require('./env');

const getApiUri = (endpoint) => `${env.getRapidProUrl()}/api/v2/${endpoint}.json`;

const get = async (url) => {
  const headers = { Authorization: `Token ${env.getRapidProAuth()}` };
  try {
    const res = await fetch(url, { method: 'GET', headers });
    return res.json();
  } catch (err) {
    log.error('Error when parsing response from RapidPro Endpoint', url, err);
    throw err;
  }
};

module.exports = {
  getApiUri,
  get,
};
