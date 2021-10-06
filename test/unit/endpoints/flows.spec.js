const sinon = require('sinon');
const { expect, assert } = require('chai');

const utils = require('../../../src/endpoints/utils');
const pgUtils = require('../../../src/pg-utils');
const rapidProUtils = require('../../../src/rapidpro-utils');
const flowsSync = require('../../../src/endpoints/flows');

const flowsUpsertStmt = 'INSERT INTO rapidpro_flows (uuid, doc) VALUES %L ' +
                   'ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';
const definitionsUpsertStmt = 'INSERT INTO rapidpro_definitions (uuid, doc) VALUES %L ' +
                              'ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';
const nodesUpsertStmt = 'INSERT INTO rapidpro_definitions_nodes (uuid, doc) VALUES %L ' +
                        'ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';

describe('flows and definitions endpoint sync', () => {
  afterEach(() => sinon.restore());

  it('should call default sync and upsert flows, definitions and nodes', async () => {
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(utils, 'sync').resolves();

    await flowsSync.sync();

    expect(utils.sync.callCount).to.equal(1);
    expect(utils.sync.args[0][0]).to.equal('flows');
    expect(utils.sync.args[0][2]).to.equal(undefined);
    const upsert = utils.sync.args[0][1];

    const results = [{ uuid: 1, a: 'result' }, { uuid: 2, another: 'result' }];
    sinon.stub(rapidProUtils, 'getApiUri').returns('apiURL');
    sinon.stub(rapidProUtils, 'get').resolves({
      flows: [
        {
          uuid: 1,
          data: 'some',
          nodes: [
            { uuid: 'node1', some: 'data' },
            { uuid: 'node2', some: 'data' },
          ],
          _ui: {
            nodes: {
              node1: { type: 'execute', position: [1, 2] },
              node2: { type: 'split', position: [1, 2] },
            }
          }
        },
        {
          uuid: 2,
          data: 'other',
          nodes: [
            { uuid: 'node3', some: 'data' },
            { uuid: 'node4', some: 'data' },
          ],
          _ui: {
            nodes: {
              node3: { type: 'wait', position: [1, 2] },
              node4: { type: 'other', position: [1, 2] },
            }
          },
        }
      ]
    });

    await upsert(results);
    expect(pgUtils.upsert.callCount).to.equal(3);
    expect(pgUtils.upsert.args[0]).to.deep.equal([
      flowsUpsertStmt,
      [
        [1, JSON.stringify({ uuid: 1, a: 'result' })],
        [2, JSON.stringify({ uuid: 2, another: 'result' }) ]
      ]
    ]);
    expect(rapidProUtils.getApiUri.callCount).to.equal(1);
    expect(rapidProUtils.getApiUri.args[0]).to.deep.equal(['definitions', 'flow=1&flow=2']);
    expect(rapidProUtils.get.callCount).to.equal(1);
    expect(rapidProUtils.get.args[0]).to.deep.equal(['apiURL']);
    expect(pgUtils.upsert.args[1]).to.deep.equal([
      definitionsUpsertStmt,
      [
        [
          1,
          JSON.stringify({
            uuid: 1,
            data: 'some',
            nodes: [
              { uuid: 'node1', some: 'data' },
              { uuid: 'node2', some: 'data' },
            ],
            _ui: {
              nodes: {
                node1: { type: 'execute', position: [1, 2] },
                node2: { type: 'split', position: [1, 2] },
              }
            }
          }),
        ],
        [
          2,
          JSON.stringify({
            uuid: 2,
            data: 'other',
            nodes: [
              { uuid: 'node3', some: 'data' },
              { uuid: 'node4', some: 'data' },
            ],
            _ui: {
              nodes: {
                node3: { type: 'wait', position: [1, 2] },
                node4: { type: 'other', position: [1, 2] },
              }
            },
          }),
        ],
      ],
    ]);

    expect(pgUtils.upsert.args[2]).to.deep.equal([
      nodesUpsertStmt,
      [
        ['node1', JSON.stringify({ uuid: 'node1', some: 'data', ui: { type: 'execute', position: [1, 2] } },)],
        ['node2', JSON.stringify({ uuid: 'node2', some: 'data', ui: { type: 'split', position: [1, 2] } },)],
        ['node3', JSON.stringify({ uuid: 'node3', some: 'data', ui: { type: 'wait', position: [1, 2] } },)],
        ['node4', JSON.stringify({ uuid: 'node4', some: 'data', ui: { type: 'other', position: [1, 2] } },)],
      ],
    ]);
  });

  it('should throw default sync errors', async () => {
    sinon.stub(utils, 'sync').rejects({ error: true });
    sinon.stub(pgUtils, 'upsert');

    try {
      await flowsSync.sync();
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ error: true });
      expect(utils.sync.callCount).to.equal(1);
      expect(utils.sync.args[0][0]).to.deep.equal('flows');
      expect(pgUtils.upsert.callCount).to.equal(0);
    }
  });

  it('should throw upsert errors', async () => {
    sinon.stub(pgUtils, 'upsert').rejects({ the: 'error' });
    sinon.stub(utils, 'sync').resolves();

    await flowsSync.sync();

    const results = [{ uuid: 'uuid1', a: 'result' }, { uuid: 'uuid2', another: 'result' }];
    const upsert = utils.sync.args[0][1];
    try {
      await upsert(results);
      assert.fail('should have failed');
    } catch (err) {
      expect(err).to.deep.equal({ the: 'error' });
      expect(pgUtils.upsert.callCount).to.equal(1);
      expect(pgUtils.upsert.args[0]).to.deep.equal([
        flowsUpsertStmt,
        [
          ['uuid1', JSON.stringify({ uuid: 'uuid1', a: 'result' })],
          ['uuid2', JSON.stringify({ uuid: 'uuid2', another: 'result' }) ],
        ]
      ]);
    }
  });

  it('should throw rapidpro get errors', async () => {
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(utils, 'sync').resolves();
    sinon.stub(rapidProUtils, 'getApiUri').returns('apiurl');
    sinon.stub(rapidProUtils, 'get').rejects({ some: 'error' });

    await flowsSync.sync();

    const results = [{ uuid: 'uuid1', a: 'result' }, { uuid: 'uuid2', another: 'result' }];
    const upsert = utils.sync.args[0][1];
    try {
      await upsert(results);
      assert.fail('should have failed');
    } catch (err) {
      expect(err).to.deep.equal({ some: 'error' });
      expect(pgUtils.upsert.callCount).to.equal(1);
      expect(rapidProUtils.getApiUri.callCount).to.equal(1);
      expect(rapidProUtils.getApiUri.args[0]).to.deep.equal(['definitions', 'flow=uuid1&flow=uuid2']);
      expect(rapidProUtils.get.callCount).to.equal(1);
    }
  });

  it('should throw when no definitions are received', async () => {
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(utils, 'sync').resolves();

    await flowsSync.sync();

    expect(utils.sync.callCount).to.equal(1);
    expect(utils.sync.args[0][0]).to.equal('flows');
    expect(utils.sync.args[0][2]).to.equal(undefined);
    const upsert = utils.sync.args[0][1];

    const results = [{ uuid: 1, a: 'result' }, { uuid: 2, another: 'result' }];
    sinon.stub(rapidProUtils, 'getApiUri').returns('apiURL');
    sinon.stub(rapidProUtils, 'get').resolves({ flows: [] });

    try {
      await upsert(results);
      assert.fail('expected to fail');
    } catch (err) {
      expect(err.message).to.equal('Unexpected result when getting flow definitions');
      expect(pgUtils.upsert.callCount).to.equal(1);
      expect(pgUtils.upsert.args[0]).to.deep.equal([
        flowsUpsertStmt,
        [
          [1, JSON.stringify({ uuid: 1, a: 'result' })],
          [2, JSON.stringify({ uuid: 2, another: 'result' }) ]
        ]
      ]);
      expect(rapidProUtils.getApiUri.callCount).to.equal(1);
      expect(rapidProUtils.getApiUri.args[0]).to.deep.equal(['definitions', 'flow=1&flow=2']);
      expect(rapidProUtils.get.callCount).to.equal(1);
      expect(rapidProUtils.get.args[0]).to.deep.equal(['apiURL']);
    }

    rapidProUtils.get.resolves({});

    try {
      await upsert(results);
      assert.fail('expected to fail');
    } catch (err) {
      expect(err.message).to.equal('Unexpected result when getting flow definitions');
      expect(pgUtils.upsert.callCount).to.equal(2);
      expect(rapidProUtils.getApiUri.callCount).to.equal(2);
      expect(rapidProUtils.getApiUri.args[1]).to.deep.equal(['definitions', 'flow=1&flow=2']);
      expect(rapidProUtils.get.callCount).to.equal(2);
      expect(rapidProUtils.get.args[1]).to.deep.equal(['apiURL']);
    }
  });

  it('upsert should do nothing for no results', async () => {
    sinon.stub(pgUtils, 'upsert');
    sinon.stub(utils, 'sync').resolves();

    await flowsSync.sync();

    expect(utils.sync.callCount).to.equal(1);
    expect(utils.sync.args[0][0]).to.equal('flows');
    expect(utils.sync.args[0][2]).to.equal(undefined);
    const upsert = utils.sync.args[0][1];


    sinon.stub(rapidProUtils, 'getApiUri');
    sinon.stub(rapidProUtils, 'get');

    await upsert([]);
    expect(pgUtils.upsert.callCount).to.equal(0);
    expect(rapidProUtils.getApiUri.callCount).to.equal(0);
    expect(rapidProUtils.get.callCount).to.equal(0);

    await upsert();
    expect(pgUtils.upsert.callCount).to.equal(0);
    expect(rapidProUtils.getApiUri.callCount).to.equal(0);
    expect(rapidProUtils.get.callCount).to.equal(0);

    await upsert(false);
    expect(pgUtils.upsert.callCount).to.equal(0);
    expect(rapidProUtils.getApiUri.callCount).to.equal(0);
    expect(rapidProUtils.get.callCount).to.equal(0);
  });

});
