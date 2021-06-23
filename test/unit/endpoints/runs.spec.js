const sinon = require('sinon');
const { expect, assert } = require('chai');
const log = require('loglevel');

const utils = require('../../../src/endpoints/utils');
const pgUtils = require('../../../src/pg-utils');
const rapidProUtils = require('../../../src/rapidpro-utils');
const runsSync = require('../../../src/endpoints/runs');

const upsertStmt = 'INSERT INTO rapidpro_runs (uuid, doc) VALUES %L ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';
const updateLastModifiedOnStmt = 'UPDATE rapidpro_runs_progress SET timestamp = %L where source = %L';
const insertLastModifiedOnStmt = 'INSERT INTO rapidpro_runs_progress(timestamp, source) values (%L,%L)';
const selectLastModifiedStmt = 'SELECT * FROM rapidpro_runs_progress WHERE source = %L';

describe('runs endpoint sync', () => {
  beforeEach(() => {
    sinon.spy(log, 'error');
  });
  afterEach(() => sinon.restore());

  it('should start initial sync', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [] });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').returns('the_source');
    sinon.stub(utils, 'sync').resolves();

    await runsSync.sync();

    expect(rapidProUtils.getSource.callCount).to.equal(1);
    expect(pgUtils.query.callCount).to.equal(1);
    expect(pgUtils.query.args[0]).to.deep.equal([
      selectLastModifiedStmt,
      'the_source'
    ]);
    expect(utils.sync.callCount).to.equal(1);
    expect(utils.sync.args[0][0]).to.deep.equal('runs');
    expect(utils.sync.args[0][2]).to.deep.equal(undefined);
    expect(pgUtils.upsert.callCount).to.equal(0);
  });

  it('should start subsequent sync', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [{ timestamp: 100 }] });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').returns('other_source');
    sinon.stub(utils, 'sync').resolves();

    await runsSync.sync();

    expect(rapidProUtils.getSource.callCount).to.equal(1);
    expect(pgUtils.query.callCount).to.equal(1);
    expect(pgUtils.query.args[0]).to.deep.equal([
      selectLastModifiedStmt,
      'other_source'
    ]);
    expect(utils.sync.callCount).to.equal(1);
    expect(utils.sync.args[0][0]).to.deep.equal('runs');
    expect(utils.sync.args[0][2]).to.deep.equal('after=100');
    expect(pgUtils.upsert.callCount).to.equal(0);
  });

  it('upsert should do nothing when no results are given', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [{ timestamp: 'some_timestamp' }] });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').returns('src');
    sinon.stub(utils, 'sync').resolves();

    await runsSync.sync();

    expect(utils.sync.callCount).to.equal(1);
    expect(utils.sync.args[0][0]).to.deep.equal('runs');
    expect(utils.sync.args[0][2]).to.deep.equal('after=some_timestamp');
    expect(pgUtils.upsert.callCount).to.equal(0);

    const upsert = utils.sync.args[0][1];

    expect(upsert).to.be.a('function');

    sinon.resetHistory();
    await upsert();
    expect(pgUtils.query.callCount).to.equal(0);
    expect(pgUtils.upsert.callCount).to.equal(0);

    await upsert('not an array');
    expect(pgUtils.query.callCount).to.equal(0);
    expect(pgUtils.upsert.callCount).to.equal(0);

    await upsert([]);
    expect(pgUtils.query.callCount).to.equal(0);
    expect(pgUtils.upsert.callCount).to.equal(0);
  });

  it('should upsert and insert last modified date on upsert', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [] });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').returns('src');
    sinon.stub(utils, 'sync').resolves();

    await runsSync.sync();
    const upsert = utils.sync.args[0][1];

    sinon.resetHistory();

    const docs = [
      { uuid: '1', name: 'one', field: 1, modified_on: 200 },
      { uuid: '2', name: 'two', field: 2, modified_on: 120 },
      { uuid: '3', name: 'three', field: 3, modified_on: 300 },
      { uuid: '4', name: 'four', field: 4, modified_on: 250 },
    ];
    await upsert(docs);

    expect(pgUtils.upsert.callCount).to.equal(1);
    expect(pgUtils.upsert.args[0]).to.deep.equal([
      upsertStmt,
      [
        ['1', JSON.stringify({ uuid: '1', name: 'one', field: 1, modified_on: 200 },)],
        ['2', JSON.stringify({ uuid: '2', name: 'two', field: 2, modified_on: 120 },)],
        ['3', JSON.stringify({ uuid: '3', name: 'three', field: 3, modified_on: 300 },)],
        ['4', JSON.stringify({ uuid: '4', name: 'four', field: 4, modified_on: 250 },)],
      ]
    ]);

    expect(pgUtils.query.callCount).to.equal(2);
    expect(pgUtils.query.args[0]).to.deep.equal([ selectLastModifiedStmt, 'src' ]);
    expect(pgUtils.query.args[1]).to.deep.equal([ insertLastModifiedOnStmt, '300', 'src' ]);
  });

  it('should upsert and update last modified date on upsert', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [{ timestamp: 100 }] });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').returns('src');
    sinon.stub(utils, 'sync').resolves();

    await runsSync.sync();
    const upsert = utils.sync.args[0][1];

    sinon.resetHistory();

    const docs = [
      { uuid: '1', name: 'one', field: 1, modified_on: 200 },
      { uuid: '2', name: 'two', field: 2, modified_on: 120 },
      { uuid: '3', name: 'three', field: 3, modified_on: 300 },
      { uuid: '4', name: 'four', field: 4, modified_on: 250 },
    ];
    await upsert(docs);

    expect(pgUtils.upsert.callCount).to.equal(1);
    expect(pgUtils.upsert.args[0]).to.deep.equal([
      upsertStmt,
      [
        ['1', JSON.stringify({ uuid: '1', name: 'one', field: 1, modified_on: 200 },)],
        ['2', JSON.stringify({ uuid: '2', name: 'two', field: 2, modified_on: 120 },)],
        ['3', JSON.stringify({ uuid: '3', name: 'three', field: 3, modified_on: 300 },)],
        ['4', JSON.stringify({ uuid: '4', name: 'four', field: 4, modified_on: 250 },)],
      ]
    ]);

    expect(pgUtils.query.callCount).to.equal(2);
    expect(pgUtils.query.args[0]).to.deep.equal([ selectLastModifiedStmt, 'src' ]);
    expect(pgUtils.query.args[1]).to.deep.equal([ updateLastModifiedOnStmt, '300', 'src' ]);

    const nextDocs = [
      { uuid: '5', name: 'five', field: 5, modified_on: 500 },
      { uuid: '6', name: 'six', field: 6, modified_on: 800 },
      { uuid: '7', name: 'seven', field: 7, modified_on: 600 },
      { uuid: '8', name: 'eight', field: 8, modified_on: 450 },
    ];
    await upsert(nextDocs);

    expect(pgUtils.upsert.callCount).to.equal(2);
    expect(pgUtils.upsert.args[1]).to.deep.equal([
      upsertStmt,
      [
        ['5', JSON.stringify({ uuid: '5', name: 'five', field: 5, modified_on: 500 },)],
        ['6', JSON.stringify({ uuid: '6', name: 'six', field: 6, modified_on: 800 },)],
        ['7', JSON.stringify( { uuid: '7', name: 'seven', field: 7, modified_on: 600 },)],
        ['8', JSON.stringify({ uuid: '8', name: 'eight', field: 8, modified_on: 450 },)],
      ]
    ]);

    expect(pgUtils.query.callCount).to.equal(4);
    expect(pgUtils.query.args[2]).to.deep.equal([ selectLastModifiedStmt, 'src' ]);
    expect(pgUtils.query.args[3]).to.deep.equal([ updateLastModifiedOnStmt, '800', 'src' ]);
  });

  it('should throw error when getSource fails', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [{ timestamp: 100 }] });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').throws({ some: 'error' });
    sinon.stub(utils, 'sync').resolves();

    try {
      await runsSync.sync();
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ some: 'error' });

      expect(rapidProUtils.getSource.callCount).to.equal(1);
      expect(pgUtils.query.callCount).to.equal(0);
      expect(utils.sync.callCount).to.equal(0);
      expect(pgUtils.upsert.callCount).to.equal(0);
    }
  });

  it('should throw error when query fails', async () => {
    sinon.stub(pgUtils, 'query').rejects({ another: 'error' });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').returns('the_source');
    sinon.stub(utils, 'sync').resolves();

    try {
      await runsSync.sync();
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ another: 'error' });

      expect(rapidProUtils.getSource.callCount).to.equal(1);
      expect(pgUtils.query.callCount).to.equal(1);
      expect(utils.sync.callCount).to.equal(0);
      expect(pgUtils.upsert.callCount).to.equal(0);
    }
  });

  it('should throw error when sync fails', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [] });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').returns('the_source');
    sinon.stub(utils, 'sync').rejects({ third: 'error' });

    try {
      await runsSync.sync();
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ third: 'error' });

      expect(rapidProUtils.getSource.callCount).to.equal(1);
      expect(pgUtils.query.callCount).to.equal(1);
      expect(utils.sync.callCount).to.equal(1);
      expect(pgUtils.upsert.callCount).to.equal(0);
    }
  });

  it('should throw error when upsert fails', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [] });
    sinon.stub(pgUtils, 'upsert').rejects({ an: 'error' });
    sinon.stub(rapidProUtils, 'getSource').returns('the_source');
    sinon.stub(utils, 'sync').resolves();

    await runsSync.sync();
    const upsert = utils.sync.args[0][1];

    sinon.resetHistory();
    const docs = [{ uuid: 'a', modified_on: '100' }];

    try {
      await upsert(docs);
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ an: 'error' });

      expect(pgUtils.upsert.callCount).to.equal(1);
      expect(pgUtils.query.callCount).to.equal(0);
    }
  });

  it('should throw error when updating last modified date fails', async () => {
    sinon.stub(pgUtils, 'query').resolves({ rows: [] });
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(rapidProUtils, 'getSource').returns('the_source');
    sinon.stub(utils, 'sync').resolves();

    await runsSync.sync();
    const upsert = utils.sync.args[0][1];

    sinon.resetHistory();
    pgUtils.query.rejects({ omg: 'error' });
    const docs = [{ uuid: 'a', modified_on: '100' }];

    try {
      await upsert(docs);
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ omg: 'error' });

      expect(pgUtils.upsert.callCount).to.equal(1);
      expect(pgUtils.query.callCount).to.equal(1);
    }
  });
});
