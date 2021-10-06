const fetch = require('node-fetch');
const log = require('loglevel');
const { URL } = require('url');

const env = require('./env');

const getApiUri = (endpoint, queryString='') => `${env.getRapidProUrl()}/api/v2/${endpoint}.json?${queryString}`;

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

const getSource = () => {
  const url = env.getRapidProUrl();
  const source = new URL(url);
  return source.host + source.pathname;
};

module.exports = {
  getApiUri,
  get,
  getSource,
};
