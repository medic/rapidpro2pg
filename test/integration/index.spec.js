const { expect } = require('chai');
const { Client } = require('pg');
const spawn = require('child_process').spawn;
const uuid = require('uuid').v4;
const logger = require('loglevel');

const rapidProMockServer = require('./rapidpro-server-mock');

const INT_PG_HOST = process.env.INT_PG_HOST || 'localhost';
const INT_PG_PORT = process.env.INT_PG_PORT || 5432;
const INT_PG_USER = process.env.INT_PG_USER || 'postgres';
const INT_PG_PASS = process.env.INT_PG_PASS || 'postgrespass';
const INT_PG_DB   = process.env.INT_PG_DB || 'rapidpro2pgtest';
const postgresUrl = `postgres://${INT_PG_USER}:${INT_PG_PASS}@${INT_PG_HOST}:${INT_PG_PORT}/${INT_PG_DB}`;

const env = {
  RAPIDPRO_URL: rapidProMockServer.getBaseUrl(),
  RAPIDPRO_AUTH: 'sample_token',
  POSTGRESQL_URL: postgresUrl,
};

const pgConnect = async () => {
  const pg = new Client({ connectionString: postgresUrl });
  await pg.connect();
  return pg;
};

const resetPg = async () => {
  const pg = await pgConnect();
  await pg.query('drop schema public cascade');
  await pg.query('create schema public');
  await pg.end();
};

const flatten = (arr) => arr.reduce((acc, val) => acc.concat(val), []);
const logIt = (logFn) => {
  return (data) => {
    data = data.toString();
    data = data.substring(0, data.length - 1);
    logFn(data);
  };
};

const getExpectedDocs = (responses, key) => flatten(
  responses.map(response => response.results.map(doc => ({ [key]: String(doc[key]), doc })))
);

const getExpectedNodes = (definitionsResponses) => {
  const expectedNodes = [];
  definitionsResponses.forEach(response => {
    response.flows.forEach(def => {
      def.nodes.forEach(node => {
        const ui = def._ui && def._ui.nodes && def._ui.nodes[node.uuid];
        const doc = Object.assign({}, node);
        if (ui) {
          doc.ui = ui;
        }
        expectedNodes.push({ uuid: node.uuid, doc }) ;
      });
    });
  });
  return expectedNodes;
};

const run = () => {
  return new Promise((resolve, reject) => {

    const childProcess = spawn('node', ['src/index.js'], { env: Object.assign({}, process.env, env), detached: true });
    childProcess.unref();
    childProcess.on('error', (err) => {
      logger.error('Error while running rapidpro2pg');
      reject(err);
    });
    childProcess.stdout.on('data', logIt(logger.info));
    childProcess.stderr.on('data', logIt(logger.error));

    childProcess.on('close', (exitCode) => {
      if (exitCode) {
        return reject(new Error(`rapidpro2pg exited with code ${exitCode}`, ));
      }
      resolve();
    });
  });
};

const getAllPgRecords = async (table) => {
  const pg = await pgConnect();
  try {
    const result = await pg.query(`select * from ${table}`);
    await pg.end();
    return result.rows;
  } catch (err) {
    await pg.end();
    throw err;
  }
};

describe('rapidpro2pg', () => {
  const contactsResponses = [
    {
      previous: null,
      next: rapidProMockServer.getUrl('contacts', '?next1'),
      results: [
        { uuid: uuid(), name: 'contact one', urns: ['tel:tel1'] },
        { uuid: uuid(), name: 'contact two', urns: ['tel:tel2'] },
      ],
    },
    {
      previous: rapidProMockServer.getUrl('contacts', '?next1'),
      next: rapidProMockServer.getUrl('contacts', '?next2'),
      results: [
        { uuid: uuid(), name: 'contact three', urns: ['tel:tel3'] },
        { uuid: uuid(), name: 'contact four', urns: ['tel:tel4'] },
      ],
    },
    {
      previous: rapidProMockServer.getUrl('contacts', '?next2'),
      next: null,
      results: [
        { uuid: uuid(), name: 'contact five', urns: ['tel:tel5'] },
      ],
    },
  ];
  const messagesResponses = [
    {
      previous: null,
      next: rapidProMockServer.getUrl('messages', '?next1'),
      results: [
        { id: 1, urn: 'tel:tel1', text: 'aaaa', type: 'flow' },
        { id: 2, urn: 'tel:tel2', text: 'bbbb', status: 'handled' },
      ],
    },
    {
      previous: rapidProMockServer.getUrl('messages', '?next1'),
      next: null,
      results: [
        { id: 3, urn: 'tel:tel3', text: 'cccc', visibility: 'visible' },
        { id: 4, urn: 'tel:tel4', text: 'dddd', direction: 'in' },
      ],
    },
  ];
  const runsResponses = [
    {
      previous: null,
      next: rapidProMockServer.getUrl('runs', '?next1'),
      results: [
        { uuid: uuid(), flow: { uuid: 'flow1', name: 'flow one' }, modified_on: '2020-01-01T12:12:12' },
        { uuid: uuid(), flow: { uuid: 'flow1', name: 'flow one' }, modified_on: '2020-01-02T12:12:12' },
      ],
    },
    {
      previous: rapidProMockServer.getUrl('runs', '?next1'),
      next: null,
      results: [
        { uuid: uuid(), flow: { uuid: 'flow2', name: 'flow two' }, modified_on: '2020-01-03T12:12:12' },
        { uuid: uuid(), flow: { uuid: 'flow2', name: 'flow two' }, modified_on: '2020-01-04T12:12:12' },
      ],
    },
  ];

  const flowsResponses = [
    {
      previous: null,
      next: rapidProMockServer.getUrl('flows', '?next1'),
      results: [
        { uuid: uuid(), name: 'flow1', results: [], modified_on: 'some date' },
        { uuid: uuid(), name: 'flow2', results: [], runs: { completed: 14 } },
      ],
    },
    {
      previous: rapidProMockServer.getUrl('flows', '?next1'),
      next: null,
      results: [
        { uuid: uuid(), name: 'flow3', results: [], modified_on: 'other date' },
        { uuid: uuid(), name: 'flow4', results: [], runs: { active: 0 } },
      ],
    },
  ];

  const uuids = Array.from({ length: 20 }).map(() => uuid());

  const definitionsResponses = [
    {
      version: '13',
      site: 'rapidprourl',
      flows: [
        {
          uuid: flowsResponses[0].results[0].uuid,
          name: flowsResponses[0].results[0].name,
          type: 'flowtype1',
          nodes: [],
          _ui: {},
          revision: 3,
          spec_version: '13.1.3',
        },
        {
          uuid: flowsResponses[0].results[1].uuid,
          name: flowsResponses[0].results[1].name,
          type: 'flowtype1',
          nodes: [
            { uuid: uuids[0], actions: [{ uuid: uuid(), type: 'type' }], exits: [{ uuid: uuid() }] },
            { uuid: uuids[1], actions: [{ uuid: uuid(), type: 'othertype' }], exits: [{ uuid: uuid() }] },
          ],
          _ui: {
            nodes: {
              [uuids[0]]: { type: 'type', position: { left: 1, right: 1 } },
              [uuids[1]]: { type: 'other', position: { left: 1, right: 1 } },
            },
          },
          revision: 3,
          spec_version: '13.1.3',
        },
      ],
    },
    {
      version: '13',
      site: 'rapidprourl',
      flows: [
        {
          uuid: flowsResponses[1].results[0].uuid,
          name: flowsResponses[1].results[0].name,
          type: 'flowtype1',
          nodes: [
            { uuid: uuids[2], actions: [{ uuid: uuid(), type: 'type' }], exits: [{ uuid: uuid() }] },
            { uuid: uuids[3], actions: [{ uuid: uuid(), type: 'othertype' }], exits: [{ uuid: uuid() }] },
            { uuid: uuids[4], actions: [{ uuid: uuid(), type: 't1' }], exits: [{ uuid: uuid() }] },
            { uuid: uuids[5], actions: [{ uuid: uuid(), type: 't2' }], exits: [{ uuid: uuid() }] },
          ],
          _ui: {
            nodes: {
              [uuids[2]]: { type: 'wait_for_response', position: { left: 1, right: 1 } },
              [uuids[3]]: { type: 'execute_actions', position: { left: 1, right: 1 } },
            },
          },
          revision: 3,
          spec_version: '13.1.3',
        },
        {
          uuid: flowsResponses[1].results[1].uuid,
          name: flowsResponses[1].results[1].name,
          type: 'flowtype2',
          nodes: [
            { uuid: uuids[6], actions: [{ uuid: uuid(), type: 'type' }], exits: [{ uuid: uuid() }] },
            { uuid: uuids[7], actions: [{ uuid: uuid(), type: 'othertype' }], exits: [{ uuid: uuid() }] },
          ],
          _ui: {
            nodes: {
              [uuids[6]]: { type: 'split_by_webhook', position: { left: 1, right: 1 } },
              [uuids[7]]: { type: 'split_by_expression', position: { left: 1, right: 1 } },
            },
          },
          revision: 3,
          spec_version: '13.1.3',
        },
      ],
    },
  ];

  describe('basic tests', () => {
    afterEach(async () => {
      rapidProMockServer.stop();
    });

    describe('initial import into postgres', () => {
      beforeEach(async () => {
        rapidProMockServer.start();
        rapidProMockServer.addResponses('contacts', ...contactsResponses);
        rapidProMockServer.addResponses('messages', ...messagesResponses);
        rapidProMockServer.addResponses('runs', ...runsResponses);
        rapidProMockServer.addResponses('flows', ...flowsResponses);
        rapidProMockServer.addResponses('definitions', ...definitionsResponses);
      });

      it('should run successfully', async () => {
        await run();
      });

      it('should have synced contacts', async () => {
        const expectedContacts = getExpectedDocs(contactsResponses, 'uuid');

        const contacts = await getAllPgRecords('rapidpro_contacts');
        expect(contacts.length).to.equal(5);
        expect(contacts).to.have.deep.members(expectedContacts);
      });

      it('should have synced messages', async () => {
        const expectedMessages = getExpectedDocs(messagesResponses, 'id');

        const messages = await getAllPgRecords('rapidpro_messages');
        expect(messages.length).to.equal(4);
        expect(messages).to.have.deep.members(expectedMessages);
      });

      it('should have synced runs', async () => {
        const expectedRuns = getExpectedDocs(runsResponses, 'uuid');

        const runs = await getAllPgRecords('rapidpro_runs');

        expect(runs.length).to.equal(4);
        expect(runs).to.have.deep.members(expectedRuns);

        const lastModifiedDate = await getAllPgRecords('rapidpro_runs_progress');
        expect(lastModifiedDate.length).to.equal(1);
        expect(lastModifiedDate[0]).to.deep.equal({ source: 'localhost:6594/', timestamp: '2020-01-04T12:12:12' });
      });

      it('should have synced flows and definitions', async () => {
        const expectedFlows = getExpectedDocs(flowsResponses, 'uuid');
        const flows = await getAllPgRecords('rapidpro_flows');
        expect(flows).to.have.deep.members(expectedFlows);

        const expectedDefinitions = flatten(
          definitionsResponses.map(response => response.flows.map(def => ({ uuid: String(def.uuid), doc: def })))
        );
        const definitions = await getAllPgRecords('rapidpro_definitions');
        expect(definitions).to.have.deep.members(expectedDefinitions);

        const expectedNodes = getExpectedNodes(definitionsResponses);
        const nodes = await getAllPgRecords('rapidpro_definitions_nodes');
        expect(nodes).to.have.deep.members(expectedNodes);
      });
    });

    describe('rerun with no changes', () => {
      beforeEach(async () => {
        rapidProMockServer.start();
        rapidProMockServer.addResponses('contacts', ...contactsResponses);
        rapidProMockServer.addResponses('messages', ...messagesResponses);
        rapidProMockServer.addResponses('runs', ...runsResponses);
      });

      it('should run successfully', async () => {
        await run();
      });

      it('should have synced contacts', async () => {
        const expectedContacts = getExpectedDocs(contactsResponses, 'uuid');

        const contacts = await getAllPgRecords('rapidpro_contacts');
        expect(contacts.length).to.equal(5);
        expect(contacts).to.have.deep.members(expectedContacts);
      });

      it('should have synced messages', async () => {
        const expectedMessages = getExpectedDocs(messagesResponses, 'id');

        const messages = await getAllPgRecords('rapidpro_messages');
        expect(messages.length).to.equal(4);
        expect(messages).to.have.deep.members(expectedMessages);
      });

      it('should have synced runs', async () => {
        const expectedRuns = getExpectedDocs(runsResponses, 'uuid');

        const runs = await getAllPgRecords('rapidpro_runs');
        expect(runs.length).to.equal(4);
        expect(runs).to.have.deep.members(expectedRuns);

        const lastModifiedDate = await getAllPgRecords('rapidpro_runs_progress');
        expect(lastModifiedDate.length).to.equal(1);
        expect(lastModifiedDate[0]).to.deep.equal({ source: 'localhost:6594/', timestamp: '2020-01-04T12:12:12' });
      });

      it('should have synced flows and definitions', async () => {
        const expectedFlows = getExpectedDocs(flowsResponses, 'uuid');
        const flows = await getAllPgRecords('rapidpro_flows');
        expect(flows).to.have.deep.members(expectedFlows);

        const expectedDefinitions = flatten(
          definitionsResponses.map(response => response.flows.map(def => ({ uuid: String(def.uuid), doc: def })))
        );
        const definitions = await getAllPgRecords('rapidpro_definitions');
        expect(definitions).to.have.deep.members(expectedDefinitions);

        const expectedNodes = getExpectedNodes(definitionsResponses);
        const nodes = await getAllPgRecords('rapidpro_definitions_nodes');
        expect(nodes).to.have.deep.members(expectedNodes);
      });
    });

    describe('rerun with changes', () => {
      beforeEach(async () => {
        rapidProMockServer.start();
      });

      it('should update contacts', async () => {
        const updatedContactResponses = JSON.parse(JSON.stringify(contactsResponses));
        updatedContactResponses.forEach(response => response.results.forEach(contact => contact.edited = true));

        updatedContactResponses[2].next = rapidProMockServer.getUrl('contacts', '?next3');
        updatedContactResponses.push({
          next: null,
          previous: rapidProMockServer.getUrl('contacts', '?next2'),
          results: [
            { uuid: uuid(), name: 'contact new1', urns: ['tel:new'] },
            { uuid: uuid(), name: 'contact new2', urns: ['tel:new'] },
          ],
        });

        const expectedContacts = getExpectedDocs(updatedContactResponses, 'uuid');
        rapidProMockServer.addResponses('contacts', ...updatedContactResponses);

        await run();
        const contacts = await getAllPgRecords('rapidpro_contacts');
        expect(contacts.length).to.equal(7);
        expect(contacts).to.have.deep.members(expectedContacts);
      });

      it('should update messages', async () => {
        const updatedMessagesResponses = JSON.parse(JSON.stringify(messagesResponses));
        updatedMessagesResponses.forEach(response => response.results.forEach(message => message.edited = true));

        updatedMessagesResponses[1].next = rapidProMockServer.getUrl('messages', '?next2');
        updatedMessagesResponses.push({
          next: null,
          previous: rapidProMockServer.getUrl('messages', '?next2'),
          results: [
            { id: 11, urn: 'tel:tel1', text: 'aaaa', type: 'flow' },
            { id: 21, urn: 'tel:tel2', text: 'bbbb', status: 'handled' },
          ],
        });

        const expectedMessages = getExpectedDocs(updatedMessagesResponses, 'id');
        rapidProMockServer.addResponses('messages', ...updatedMessagesResponses);

        await run();
        const messages = await getAllPgRecords('rapidpro_messages');
        expect(messages.length).to.equal(6);
        expect(messages).to.have.deep.members(expectedMessages);
      });

      it('should update runs', async () => {
        const updatedRunsResponses = JSON.parse(JSON.stringify(runsResponses));
        const modifiedOnArray = [
          '2020-02-03T12:12:12',
          '2020-03-05T12:12:12',
          '2020-02-04T12:12:12',
          '2020-03-04T12:12:12',
        ];
        updatedRunsResponses.forEach(response => response.results.forEach(run => {
          run.edited = true;
          run.modified_on = modifiedOnArray.pop();
        }));

        updatedRunsResponses[1].next = rapidProMockServer.getUrl('runs', '?next2');
        updatedRunsResponses.push({
          previous: rapidProMockServer.getUrl('runs', '?next2'),
          next: null,
          results: [
            { uuid: uuid(), edited: true, flow: { uuid: 'flow2' }, modified_on: '2020-01-07T12:12:12' },
            { uuid: uuid(), edited: true, flow: { uuid: 'flow2' }, modified_on: '2020-01-04T12:12:12' },
          ],
        });

        const expectedRuns = getExpectedDocs(updatedRunsResponses, 'uuid');
        rapidProMockServer.addResponses('runs', ...updatedRunsResponses);

        await run();
        const runs = await getAllPgRecords('rapidpro_runs');
        expect(runs.length).to.equal(6);
        expect(runs).to.have.deep.members(expectedRuns);
        expect(runs.every(run => run.doc.edited)).to.equal(true);

        const lastModifiedDate = await getAllPgRecords('rapidpro_runs_progress');
        expect(lastModifiedDate.length).to.equal(1);
        expect(lastModifiedDate[0]).to.deep.equal({ source: 'localhost:6594/', timestamp: '2020-03-05T12:12:12' });
      });

      it('should update flows and definitions', async () => {
        const updatedFlowsResponses = JSON.parse(JSON.stringify(flowsResponses));
        updatedFlowsResponses.forEach(response => response.results.forEach(flow => flow.edited = true));
        updatedFlowsResponses[1].next = rapidProMockServer.getUrl('flows', '?next2');
        updatedFlowsResponses.push({
          previous: rapidProMockServer.getUrl('flows', '?next2'),
          next: null,
          results: [
            { uuid: uuid(), name: 'flow5', results: [], modified_on: 'other date' },
            { uuid: uuid(), name: 'flow6', results: [], runs: { active: 0 } },
          ],
        });

        rapidProMockServer.addResponses('flows', ...updatedFlowsResponses);

        const updatedDefinitionsResponses = JSON.parse(JSON.stringify(definitionsResponses));
        updatedDefinitionsResponses.forEach(response => response.flows.forEach(def => {
          def.edited = true;
          def.nodes.forEach(node => node.edited = true);
          def._ui && def._ui.nodes && Object.keys(def._ui.nodes).forEach(uuid => def._ui.nodes[uuid].edited = true);
        }));
        updatedDefinitionsResponses.push({
          version: '13',
          site: 'rapidprourl',
          flows: [
            {
              uuid: updatedFlowsResponses[2].results[0].uuid,
              name: updatedFlowsResponses[2].results[0].name,
              type: 'flowtype1',
              nodes: [
                { uuid: uuids[8], actions: [{ uuid: uuid(), type: 'type' }], exits: [{ uuid: uuid() }] },
                { uuid: uuids[9], actions: [{ uuid: uuid(), type: 'othertype' }], exits: [{ uuid: uuid() }] },
              ],
              _ui: {
                nodes: {},
              },
              revision: 3,
              spec_version: '13.1.3',
            },
            {
              uuid: updatedFlowsResponses[2].results[1].uuid,
              name: updatedFlowsResponses[2].results[1].name,
              type: 'flowtype2',
              nodes: [
                { uuid: uuids[10], actions: [{ uuid: uuid(), type: 'type' }], exits: [{ uuid: uuid() }] },
                { uuid: uuids[11], actions: [{ uuid: uuid(), type: 'othertype' }], exits: [{ uuid: uuid() }] },
              ],
              _ui: {
                nodes: {
                  [uuids[10]]: { type: 'split_by_webhook', position: { left: 1, right: 1 } },
                  [uuids[11]]: { type: 'split_by_expression', position: { left: 1, right: 1 } },
                },
              },
              revision: 3,
              spec_version: '13.1.3',
            },
          ],
        });

        rapidProMockServer.addResponses('definitions', ...updatedDefinitionsResponses);

        await run();

        const expectedFlows = getExpectedDocs(updatedFlowsResponses, 'uuid');
        const flows = await getAllPgRecords('rapidpro_flows');
        expect(flows).to.have.deep.members(expectedFlows);

        const expectedDefinitions = flatten(
          updatedDefinitionsResponses.map(response => response.flows.map(def => ({ uuid: String(def.uuid), doc: def })))
        );
        const definitions = await getAllPgRecords('rapidpro_definitions');
        expect(definitions).to.have.deep.members(expectedDefinitions);

        const expectedNodes = getExpectedNodes(updatedDefinitionsResponses);
        const nodes = await getAllPgRecords('rapidpro_definitions_nodes');
        expect(nodes).to.have.deep.members(expectedNodes);
      });
    });
  });

  after(async () => {
    await resetPg();
  });
});
