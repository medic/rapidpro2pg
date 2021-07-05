const rewire = require('rewire');
const sinon = require('sinon');
const { expect, assert } = require('chai');

const env = require('../../src/env');
const pgUtils = rewire('../../src/pg-utils');

describe('pg-utils', () => {
  let format;
  let revertFormat;
  let pgClientConstructor;
  let pgClient;
  let revertPgClient;

  beforeEach(() => {
    format = sinon.stub();
    revertFormat = pgUtils.__set__('format', format);
    pgClient = {
      connect: sinon.stub(),
      query: sinon.stub(),
      end: sinon.stub(),
    };
    pgClientConstructor = sinon.stub().returns(pgClient);
    revertPgClient = pgUtils.__set__('Client', pgClientConstructor);
    sinon.stub(env, 'getPostgresUrl');
  });

  afterEach(() => {
    sinon.restore();
    revertFormat();
    revertPgClient();
  });

  describe('upsert', () => {
    it('should upsert docs', async () => {
      const insertStmt = 'INSERT INTO contacts (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc';
      const docs = ['a', 'b', 'c'];
      env.getPostgresUrl.returns('postgres:something:something');
      format.returns('formatted sql statement');
      pgClient.connect.resolves();
      pgClient.query.resolves();
      pgClient.end.resolves();

      await pgUtils.upsert(insertStmt, docs);

      expect(format.callCount).to.equal(1);
      expect(format.args[0]).to.deep.equal([
        insertStmt,
        ['a', 'b', 'c'],
      ]);
      expect(pgClientConstructor.callCount).to.equal(1);
      expect(pgClientConstructor.args[0]).to.deep.equal([{ connectionString: 'postgres:something:something' }]);

      expect(pgClient.connect.callCount).to.equal(1);
      expect(pgClient.query.callCount).to.equal(1);
      expect(pgClient.query.args[0]).to.deep.equal(['formatted sql statement']);
      expect(pgClient.end.callCount).to.equal(1);
    });

    it('should do nothing when no docs are passed', async () => {
      const insertStmt = 'INSERT INTO contacts (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc';
      const docs = [];
      env.getPostgresUrl.returns('postgres:something:something');

      await pgUtils.upsert(insertStmt, docs);

      expect(format.callCount).to.equal(0);
      expect(pgClientConstructor.callCount).to.equal(0);
      expect(pgClient.connect.callCount).to.equal(0);
      expect(pgClient.query.callCount).to.equal(0);
      expect(pgClient.end.callCount).to.equal(0);
    });

    it('should throw format errors', async () => {
      const insertStmt = 'INSERT INTO flows (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc';
      const docs = [1, 2, 3];

      format.throws({ an: 'error' });

      try {
        await pgUtils.upsert(insertStmt, docs);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
        expect(format.callCount).to.equal(1);
        expect(format.args[0]).to.deep.equal([
          insertStmt,
          [1, 2, 3],
        ]);
        expect(pgClientConstructor.callCount).to.equal(0);
        expect(pgClient.connect.callCount).to.equal(0);
        expect(pgClient.query.callCount).to.equal(0);
        expect(pgClient.end.callCount).to.equal(0);
      }
    });

    it('should throw connection errors', async () => {
      const insertStmt = 'INSERT INTO runs (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc';
      const docs = ['a', 'b', 'c'];

      env.getPostgresUrl.returns('postgres:uri');
      format.returns('formatted sql statement');
      pgClient.connect.rejects({ some: 'error' });

      try {
        await pgUtils.upsert(insertStmt, docs);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
        expect(format.callCount).to.equal(1);
        expect(format.args[0]).to.deep.equal([
          insertStmt,
          ['a', 'b', 'c'],
        ]);
        expect(pgClientConstructor.callCount).to.equal(1);
        expect(pgClientConstructor.args[0]).to.deep.equal([{ connectionString: 'postgres:uri' }]);

        expect(pgClient.connect.callCount).to.equal(1);
        expect(pgClient.query.callCount).to.equal(0);
        expect(pgClient.end.callCount).to.equal(1);
      }
    });

    it('should throw query errors', async () => {
      const insertStmt = 'INSERT INTO thing (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc';
      const docs = ['a', 'b', 'c'];

      env.getPostgresUrl.returns('the host');
      format.returns('statement');
      pgClient.connect.resolves();
      pgClient.query.rejects({ some: 'error' });

      try {
        await pgUtils.upsert(insertStmt, docs);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
        expect(format.callCount).to.equal(1);
        expect(format.args[0]).to.deep.equal([
          insertStmt,
          ['a', 'b', 'c'],
        ]);
        expect(pgClientConstructor.callCount).to.equal(1);
        expect(pgClientConstructor.args[0]).to.deep.equal([{ connectionString: 'the host' }]);

        expect(pgClient.connect.callCount).to.equal(1);
        expect(pgClient.query.callCount).to.equal(1);
        expect(pgClient.query.args[0]).to.deep.equal(['statement']);
        expect(pgClient.end.callCount).to.equal(1);
      }
    });
  });

  describe('query', () => {
    it('should execute query with all params', async () => {
      const queryStmt = 'someQuery';
      const params = ['a', 1, 'b', 2];
      env.getPostgresUrl.returns('postgres:something:something');
      format.returns('formatted sql statement');
      pgClient.connect.resolves();
      pgClient.query.resolves();
      pgClient.end.resolves();

      await pgUtils.query(queryStmt, ...params);

      expect(format.callCount).to.equal(1);
      expect(format.args[0]).to.deep.equal([ queryStmt, 'a', 1, 'b', 2 ]);
      expect(pgClientConstructor.callCount).to.equal(1);
      expect(pgClientConstructor.args[0]).to.deep.equal([{ connectionString: 'postgres:something:something' }]);

      expect(pgClient.connect.callCount).to.equal(1);
      expect(pgClient.query.callCount).to.equal(1);
      expect(pgClient.query.args[0]).to.deep.equal(['formatted sql statement']);
      expect(pgClient.end.callCount).to.equal(1);
    });

    it('should execute query with no params', async () => {
      const queryStmt = 'someQuery';
      env.getPostgresUrl.returns('postgres:something:something');
      format.returns('formatted sql statement');
      pgClient.connect.resolves();
      pgClient.query.resolves();
      pgClient.end.resolves();

      await pgUtils.query(queryStmt);

      expect(format.callCount).to.equal(1);
      expect(format.args[0]).to.deep.equal([ queryStmt ]);
      expect(pgClientConstructor.callCount).to.equal(1);
      expect(pgClientConstructor.args[0]).to.deep.equal([{ connectionString: 'postgres:something:something' }]);

      expect(pgClient.connect.callCount).to.equal(1);
      expect(pgClient.query.callCount).to.equal(1);
      expect(pgClient.query.args[0]).to.deep.equal(['formatted sql statement']);
      expect(pgClient.end.callCount).to.equal(1);
    });

    it('should throw format errors', async () => {
      const stmt = 'somestmt';

      format.throws({ an: 'error' });

      try {
        await pgUtils.query(stmt, 1, 2, 3);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
        expect(format.callCount).to.equal(1);
        expect(format.args[0]).to.deep.equal([ stmt, 1, 2, 3 ]);
        expect(pgClientConstructor.callCount).to.equal(0);
        expect(pgClient.connect.callCount).to.equal(0);
        expect(pgClient.query.callCount).to.equal(0);
        expect(pgClient.end.callCount).to.equal(0);
      }
    });

    it('should throw connection errors', async () => {
      const stmt = 'statement';

      env.getPostgresUrl.returns('postgres:uri');
      format.returns('formatted sql statement');
      pgClient.connect.rejects({ some: 'error' });

      try {
        await pgUtils.query(stmt);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
        expect(format.callCount).to.equal(1);
        expect(format.args[0]).to.deep.equal([ stmt ]);
        expect(pgClientConstructor.callCount).to.equal(1);
        expect(pgClientConstructor.args[0]).to.deep.equal([{ connectionString: 'postgres:uri' }]);

        expect(pgClient.connect.callCount).to.equal(1);
        expect(pgClient.query.callCount).to.equal(0);
        expect(pgClient.end.callCount).to.equal(1);
      }
    });

    it('should throw query errors', async () => {
      const stmt = 'INSERT';

      env.getPostgresUrl.returns('the host');
      format.returns('statement');
      pgClient.connect.resolves();
      pgClient.query.rejects({ some: 'error' });

      try {
        await pgUtils.query(stmt);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
        expect(format.callCount).to.equal(1);
        expect(format.args[0]).to.deep.equal([ stmt ]);
        expect(pgClientConstructor.callCount).to.equal(1);
        expect(pgClientConstructor.args[0]).to.deep.equal([{ connectionString: 'the host' }]);

        expect(pgClient.connect.callCount).to.equal(1);
        expect(pgClient.query.callCount).to.equal(1);
        expect(pgClient.query.args[0]).to.deep.equal(['statement']);
        expect(pgClient.end.callCount).to.equal(1);
      }
    });
  });
});
