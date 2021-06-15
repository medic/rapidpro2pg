const sinon = require('sinon');
const { expect, assert } = require('chai');
const log = require('loglevel');

const defaultSync = require('../../../src/endpoints/sync-endpoint');
const runsSync = require('../../../src/endpoints/runs');

describe('runs endpoint sync', () => {
  beforeEach(() => {
    sinon.spy(log, 'error');
  });
  afterEach(() => sinon.restore());

  it('should call default sync', async () => {
    sinon.stub(defaultSync, 'sync').resolves();

    await runsSync.sync();

    expect(defaultSync.sync.callCount).to.equal(1);
    expect(defaultSync.sync.args[0]).to.deep.equal(['runs', 'rapidpro_runs']);
  });

  it('should throw default sync errors', async () => {
    sinon.stub(defaultSync, 'sync').rejects({ error: true });

    try {
      await runsSync.sync();
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ error: true });
      expect(defaultSync.sync.callCount).to.equal(1);
      expect(defaultSync.sync.args[0]).to.deep.equal(['runs', 'rapidpro_runs']);
      expect(log.error.callCount).to.equal(1);
    }
  });
});
