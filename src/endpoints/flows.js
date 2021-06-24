const log = require('loglevel');
const { URLSearchParams } = require('url');

const utils = require('./utils');
const pgUtils = require('../pg-utils');
const rapidProUtils = require('../rapidpro-utils');

const FLOWS_ENDPOINT_NAME = 'flows';
const DEFINITIONS_ENDPOINT_NAME = 'definitions';
const FLOWS_UPSERT_ST = 'INSERT INTO rapidpro_flows (uuid, doc) VALUES %L ' +
                        'ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';
const DEFINITIONS_UPSERT_ST = 'INSERT INTO rapidpro_definitions (uuid, doc) VALUES %L ' +
                              'ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';
const NODES_UPSERT_ST = 'INSERT INTO rapidpro_definitions_nodes (uuid, doc) VALUES %L ' +
                        'ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';

const getRecord = (item) => ([ item.uuid, JSON.stringify(item) ]);
const getNodeRecord = (node, ui) => {
  node.ui = ui;
  return getRecord(node);
};

const syncDefinitions = async (flows) => {
  const queryString = new URLSearchParams();
  flows.forEach(flow => flow.uuid && queryString.append('flow', flow.uuid));
  const definitionsUrl = rapidProUtils.getApiUri(DEFINITIONS_ENDPOINT_NAME, queryString.toString());
  const definitions = await rapidProUtils.get(definitionsUrl);

  if (!definitions || !definitions.flows || !definitions.flows.length) {
    const error =  new Error('Unexpected result when getting flow definitions');
    error.result = definitions;
    throw error;
  }

  await upsertDefinitions(definitions.flows);
};

const upsertDefinitions = async (definitions) => {
  const records = definitions.map(getRecord);
  await pgUtils.upsert(DEFINITIONS_UPSERT_ST, records);
  await upsertNodes(definitions);
};

const upsertNodes = async(definitions) => {
  const records = [];
  definitions.forEach(definition => {
    if (Array.isArray(definition.nodes)) {
      definition.nodes.forEach(node => {
        const ui = definition._ui && definition._ui.nodes && definition._ui.nodes[node.uuid];
        records.push(getNodeRecord(node, ui));
      });
    }
  });

  await pgUtils.upsert(NODES_UPSERT_ST, records);
};

const upsert = async (results) => {
  if (!Array.isArray(results) || !results.length) {
    return Promise.resolve();
  }

  const records = results.map(getRecord);
  await pgUtils.upsert(FLOWS_UPSERT_ST, records);
  await syncDefinitions(results);
};

module.exports = {
  sync: async () => {
    try {
      await utils.sync(FLOWS_ENDPOINT_NAME, upsert);
    } catch (err) {
      log.error('Error when syncing flows', err);
      throw err;
    }
  },
};
