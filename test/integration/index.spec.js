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
}

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

const run = () => {
  return new Promise((resolve, reject) => {
    const childProcess = spawn('node', ['src/index.js'], { env: { ...process.env, ...env } });
    childProcess.on('error', (err) => {
      logger.error('Error while running rapidpro2pg');
      reject(err);
    });

    childProcess.stdout.on('data', logIt(logger.debug));
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
  const result = await pg.query(`select * from ${table}`);
  await pg.end();
  return result.rows;
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
        { uuid: uuid(), id: 1, flow: { uuid: 'flow1', name: 'flow one' }, contact: { uuid: 'contact1', name: 'one' } },
        { uuid: uuid(), id: 2, flow: { uuid: 'flow1', name: 'flow one' }, contact: { uuid: 'contact1', name: 'one' } },
      ],
    },
    {
      previous: rapidProMockServer.getUrl('runs', '?next1'),
      next: null,
      results: [
        { uuid: uuid(), id: 3, flow: { uuid: 'flow2', name: 'flow two' }, contact: { uuid: 'c3', name: 'contact' } },
        { uuid: uuid(), id: 4, flow: { uuid: 'flow2', name: 'flow two' }, contact: { uuid: 'c3', name: 'contact' } },
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
      });
    });

    describe('rerun with changes', () => {
      beforeEach(async () => {
        rapidProMockServer.start();
      });

      it('should update contacts', async () => {
        const updatedContactResponses = JSON.parse(JSON.stringify(contactsResponses));
        updatedContactResponses.forEach(response => response.results.forEach(contact => contact.edited = true));
        const expectedContacts = getExpectedDocs(updatedContactResponses, 'uuid');
        rapidProMockServer.addResponses('contacts', ...updatedContactResponses);

        await run();
        const contacts = await getAllPgRecords('rapidpro_contacts');
        expect(contacts.length).to.equal(5);
        expect(contacts).to.have.deep.members(expectedContacts);
      });

      it('should update messages', async () => {
        const updatedMessagesResponses = JSON.parse(JSON.stringify(messagesResponses));
        updatedMessagesResponses.forEach(response => response.results.forEach(message => message.edited = true));
        const expectedMessages = getExpectedDocs(updatedMessagesResponses, 'id');
        rapidProMockServer.addResponses('messages', ...updatedMessagesResponses);

        await run();
        const messages = await getAllPgRecords('rapidpro_messages');
        expect(messages.length).to.equal(4);
        expect(messages).to.have.deep.members(expectedMessages);
      });

      it('should update runs', async () => {
        const updatedRunsResponses = JSON.parse(JSON.stringify(runsResponses));
        updatedRunsResponses.forEach(response => response.results.forEach(run => run.edited = true));
        const expectedRuns = getExpectedDocs(updatedRunsResponses, 'uuid');
        rapidProMockServer.addResponses('runs', ...updatedRunsResponses);

        await run();
        const runs = await getAllPgRecords('rapidpro_runs');
        expect(runs.length).to.equal(4);
        expect(runs).to.have.deep.members(expectedRuns);
        expect(runs.every(run => run.doc.edited)).to.equal(true);
      });
    });
  });

  after(async () => {
    await resetPg();
  });
});
