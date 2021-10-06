const sinon = require('sinon');
const { expect, assert } = require('chai');
const path = require('path');
const rewire = require('rewire');

const migrations = rewire('../../src/migrations');
const env = require('../../src/env');

describe('migrations', () => {
  let pg;
  let migrate;
  let pgUrl;
  let revert;

  beforeEach(() => {
    migrate = sinon.stub();
    pg = sinon.stub().returns({ migrate });
    revert = migrations.__set__('Postgrator', pg);
    pgUrl = 'postgres://couch2pg:secret=@localhost:5432/db';
  });

  afterEach(() => {
    sinon.restore();
    revert();
  });

  describe('run', () => {
    it('should call postgrator with correct params', async () => {
      migrate.resolves('value');
      sinon.stub(env, 'getPostgresUrl').returns(pgUrl);

      const result = await migrations.run();

      expect(result).to.equal('value');
      expect(pg.callCount).to.equal(1);
      expect(pg.args[0]).to.deep.equal([{
        migrationDirectory: path.join(__dirname, '../../src/migrations'),
        driver: 'pg',
        connectionString: pgUrl,
        schemaTable: 'rapidpro2pg_migrations'
      }]);
      expect(migrate.callCount).to.equal(1);
      expect(migrate.args[0]).to.deep.equal([]);
    });

    it('should catch and throw errors', async () => {
      migrate.rejects({ some: 'error' });

      try {
        await migrations.run(pgUrl);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
      }
    });
  });
});
