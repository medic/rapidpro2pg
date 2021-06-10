const fetch = require('node-fetch');
const log = require('loglevel');

const env = require('./env');

const headers = { Authorization: `Token ${env.getRapidProAuth()}` };
const rapidProUrl = env.getRapidProUrl();

const getApiUri = (endpoint) => `${rapidProUrl}/api/v2/${endpoint}.json`;

const get = async (url) => {
  const res = await fetch(url, { method: 'GET', headers });
  try {
    return res.json();
  } catch (err) {
    log.error('Error when parsing response from RapidPro Endpoint', endpoint, err);
    throw err;
  }
};

module.exports = {
  getApiUri,
  get,
};
