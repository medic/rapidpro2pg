const log = require('loglevel');
const { URLSearchParams } = require('url');

const utils = require('./utils');
const pgUtils = require('../pg-utils');
const rapidProUtils = require('../rapidpro-utils');

const ENDPOINT_NAME = 'runs';
const UPSERT_ST = `INSERT INTO rapidpro_runs (uuid, doc) VALUES %L ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc`;
const SELECT_LAST_MODIFIED_ST = 'SELECT * FROM rapidpro_runs_progress WHERE source = %L';
const UPDATE_LAST_MODIFIED_ST = 'UPDATE rapidpro_runs_progress SET timestamp = %L where source = %L';
const INSERT_LAST_MODIFIED_ST = 'INSERT INTO rapidpro_runs_progress(timestamp, source) values (%L,%L)';

const upsert = async (results) => {
  if (!Array.isArray(results) || !results.length) {
    return Promise.resolve();
  }
  const records = results.map(result => ([ result.uuid, JSON.stringify(result) ]));
  await pgUtils.upsert(UPSERT_ST, records);
  await updateLastModifiedOn(results);
};

const getQueryParams = async () => {
  const lastModifiedDate = await getLastModifiedOn();
  if (!lastModifiedDate) {
    return;
  }

  return new URLSearchParams({ after: lastModifiedDate }).toString();
};

const getLastModifiedOn = async () => {
  const source = rapidProUtils.getSource();
  const result = await pgUtils.query(SELECT_LAST_MODIFIED_ST, source);

  if (!result || !result.rows || !result.rows.length) {
    return;
  }

  return result.rows[0].timestamp;
};

const updateLastModifiedOn = async (results) => {
  const source = rapidProUtils.getSource();
  let lastModifiedOn = await getLastModifiedOn();
  const STMT = lastModifiedOn ? UPDATE_LAST_MODIFIED_ST : INSERT_LAST_MODIFIED_ST;

  results.forEach(result => {
    if (!lastModifiedOn || result.modified_on > lastModifiedOn) {
      lastModifiedOn = result.modified_on;
    }
  });
  return pgUtils.query(STMT, String(lastModifiedOn), source);
};

module.exports = {
  sync: async () => {
    try {
      const queryParams = await getQueryParams();
      await utils.sync(ENDPOINT_NAME, upsert, queryParams);
    } catch (err) {
      log.error('error when syncing runs', err);
      throw err;
    }
  },
};
