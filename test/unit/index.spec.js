const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const env = require('../../src/env');
const migrations = require('../../src/migrations');
const refreshMatViews = require('../../src/refresh-materialized-views');
const syncContacts = require('../../src/endpoints/contacts');
const syncMessages = require('../../src/endpoints/messages');
const syncRuns = require('../../src/endpoints/runs');
const flowsRuns = require('../../src/endpoints/flows');

describe('rapidPro2pg', () => {
  const nextTick = () => new Promise(resolve => setTimeout(resolve));

  beforeEach(() => {
    sinon.stub(process, 'exit');
    sinon.stub(env, 'validateEnv');
    sinon.stub(migrations, 'run');
    sinon.stub(refreshMatViews, 'run');
    sinon.stub(syncContacts, 'sync');
    sinon.stub(syncMessages, 'sync');
    sinon.stub(syncRuns, 'sync');
    sinon.stub(flowsRuns, 'sync');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should validate env and stop processing if validation fails', async () => {
    env.validateEnv.returns(false);
    rewire('../../src/index');

    await nextTick();

    expect(env.validateEnv.callCount).to.equal(1);
    expect(process.exit.callCount).to.equal(1);
    expect(process.exit.args[0]).to.deep.equal([1]);

    expect(migrations.run.callCount).to.equal(0);
    expect(refreshMatViews.run.callCount).to.equal(0);
    expect(syncRuns.sync.callCount).to.equal(0);
    expect(syncContacts.sync.callCount).to.equal(0);
    expect(syncMessages.sync.callCount).to.equal(0);
    expect(flowsRuns.sync.callCount).to.equal(0);
  });

  it('should validate env, run all migrations, syncs, and refresh views ', async () => {
    env.validateEnv.returns(true);
    rewire('../../src/index');

    await nextTick();

    expect(env.validateEnv.callCount).to.equal(1);
    expect(process.exit.callCount).to.equal(0);

    expect(migrations.run.callCount).to.equal(1);
    expect(refreshMatViews.run.callCount).to.equal(1);
    expect(syncRuns.sync.callCount).to.equal(1);
    expect(syncContacts.sync.callCount).to.equal(1);
    expect(syncMessages.sync.callCount).to.equal(1);
    expect(flowsRuns.sync.callCount).to.equal(1);
  });

  it('should catch errors and exit with error code', async () => {
    env.validateEnv.returns(true);
    migrations.run.rejects({ some: 'error' });
    rewire('../../src/index');

    await nextTick();

    expect(env.validateEnv.callCount).to.equal(1);
    expect(migrations.run.callCount).to.equal(1);

    expect(process.exit.callCount).to.equal(1);
    expect(process.exit.args[0]).to.deep.equal([1]);

    expect(refreshMatViews.run.callCount).to.equal(0);
    expect(syncRuns.sync.callCount).to.equal(0);
    expect(syncContacts.sync.callCount).to.equal(0);
    expect(syncMessages.sync.callCount).to.equal(0);
    expect(flowsRuns.sync.callCount).to.equal(0);
  });
});

