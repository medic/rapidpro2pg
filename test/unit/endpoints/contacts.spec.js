const sinon = require('sinon');
const { expect, assert } = require('chai');

const utils = require('../../../src/endpoints/utils');
const pgUtils = require('../../../src/pg-utils');
const contactsSync = require('../../../src/endpoints/contacts');

const insertStmt =
        'INSERT INTO rapidpro_contacts (uuid, doc) VALUES %L ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';

describe('contacts endpoint sync', () => {
  afterEach(() => sinon.restore());

  it('should call default sync', async () => {
    sinon.stub(pgUtils, 'upsert').resolves();
    sinon.stub(utils, 'sync').resolves();

    await contactsSync.sync();

    expect(utils.sync.callCount).to.equal(1);
    expect(utils.sync.args[0][0]).to.equal('contacts');
    expect(utils.sync.args[0][2]).to.equal(undefined);
    const upsert = utils.sync.args[0][1];

    const results = [{ uuid: 1, a: 'result' }, { uuid: 2, another: 'result' }];

    await upsert(results);
    expect(pgUtils.upsert.callCount).to.equal(1);
    expect(pgUtils.upsert.args[0]).to.deep.equal([
      insertStmt,
      [[1, JSON.stringify({ uuid: 1, a: 'result' })], [2, JSON.stringify({ uuid: 2, another: 'result' }) ]]
    ]);
  });

  it('should throw default sync errors', async () => {
    sinon.stub(utils, 'sync').rejects({ error: true });
    sinon.stub(pgUtils, 'upsert');

    try {
      await contactsSync.sync();
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ error: true });
      expect(utils.sync.callCount).to.equal(1);
      expect(utils.sync.args[0][0]).to.deep.equal('contacts');
      expect(pgUtils.upsert.callCount).to.equal(0);
    }
  });

  it('should throw upsert errors', async () => {
    sinon.stub(pgUtils, 'upsert').rejects({ some: 'error' });
    sinon.stub(utils, 'sync').resolves();

    await contactsSync.sync();

    expect(utils.sync.callCount).to.equal(1);
    expect(utils.sync.args[0][0]).to.equal('contacts');
    expect(utils.sync.args[0][2]).to.equal(undefined);
    const upsert = utils.sync.args[0][1];

    const results = [{ uuid: 1, a: '2' }, { uuid: 2, another: '3' }];

    try {
      await upsert(results);
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ some: 'error' });
      expect(pgUtils.upsert.callCount).to.equal(1);
      expect(pgUtils.upsert.args[0]).to.deep.equal([
        insertStmt,
        [[1, JSON.stringify({ uuid: 1, a: '2' })], [2, JSON.stringify({ uuid: 2, another: '3' }) ]]
      ]);
    }

  });
});
