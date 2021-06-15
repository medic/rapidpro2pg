const sinon = require('sinon');
const { expect, assert } = require('chai');

const defaultSync = require('../../../src/endpoints/sync-endpoint');
const messagesSync = require('../../../src/endpoints/messages');

describe('messages endpoint sync', () => {
  afterEach(() => sinon.restore());

  it('should call default sync', async () => {
    sinon.stub(defaultSync, 'sync').resolves();

    await messagesSync.sync();

    expect(defaultSync.sync.callCount).to.equal(1);
    expect(defaultSync.sync.args[0]).to.deep.equal(['messages', 'rapidpro_messages']);
  });

  it('should throw default sync errors', async () => {
    sinon.stub(defaultSync, 'sync').rejects({ error: true });

    try {
      await messagesSync.sync();
      assert.fail('should have thrown');
    } catch (err) {
      expect(err).to.deep.equal({ error: true });
      expect(defaultSync.sync.callCount).to.equal(1);
      expect(defaultSync.sync.args[0]).to.deep.equal(['messages', 'rapidpro_messages']);
    }
  });
});
