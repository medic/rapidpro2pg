const sinon = require('sinon');
const { expect, assert } = require('chai');

const rapidProUtils = require('../../../src/rapidpro-utils');
const pgUtils = require('../../../src/pg-utils');
const syncEndpoint = require('../../../src/endpoints/sync-endpoint');

describe('sync endpoint', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('sync', () => {
    it('should sync correctly', async () => {
      sinon.stub(rapidProUtils, 'getApiUri').returns('http://rapid.pro/api/v1/theEndpoint');
      sinon.stub(rapidProUtils, 'get').resolves({
        results: [
          { uuid: '123', data: 'a', extra: 'b' },
          { uuid: '456', data: 'aa', extra: 'bb' },
          { uuid: '789', data: 'aaa', extra: 'bbb' },
          { uuid: '101112', data: 'aaaa', extra: 'bbbb' },
        ],
        next: null,
        previous: null,
      });
      sinon.stub(pgUtils, 'upsert').resolves();

      await syncEndpoint.sync('theEndpoint', 'theDbName');

      expect(rapidProUtils.getApiUri.callCount).to.equal(1);
      expect(rapidProUtils.getApiUri.args[0]).to.deep.equal(['theEndpoint']);
      expect(rapidProUtils.get.callCount).to.equal(1);
      expect(rapidProUtils.get.args[0]).to.deep.equal(['http://rapid.pro/api/v1/theEndpoint']);
      expect(pgUtils.upsert.callCount).to.equal(1);
      expect(pgUtils.upsert.args[0]).to.deep.equal([
        'theDbName',
        [
          ['123', JSON.stringify({ uuid: '123', data: 'a', extra: 'b' })],
          ['456', JSON.stringify({ uuid: '456', data: 'aa', extra: 'bb' })],
          ['789', JSON.stringify({ uuid: '789', data: 'aaa', extra: 'bbb' })],
          ['101112', JSON.stringify({ uuid: '101112', data: 'aaaa', extra: 'bbbb' })],
        ]
      ]);
    });

    it('should continue querying and syncing until no next page', async () => {
      sinon.stub(rapidProUtils, 'getApiUri').returns('http://rapid.pro/api/v1/edp');
      sinon.stub(rapidProUtils, 'get')
        .onCall(0).resolves({
          results: [ { uuid: '123', data: 'a', extra: 'b' } ],
          next: 'http://rapid.pro/api/v1/edp?p=2',
          previous: null,
        })
        .onCall(1).resolves({
          results: [ { uuid: '456', data: 'aa', extra: 'bb' } ],
          next: 'http://rapid.pro/api/v1/edp?p=3',
          previous: 'http://rapid.pro/api/v1/edp?p=2',
        })
        .onCall(2).resolves({
          results: [ { uuid: '789', data: 'aaa', extra: 'bbb' } ],
          next: 'http://rapid.pro/api/v1/edp?p=4',
          previous: 'http://rapid.pro/api/v1/edp?p=3',
        })
        .onCall(3).resolves({
          results: [ { uuid: '101112', data: 'aaaa', extra: 'bbbb' } ],
          next: null,
          previous: 'http://rapid.pro/api/v1/edp?p=4',
        });
      sinon.stub(pgUtils, 'upsert').resolves();

      await syncEndpoint.sync('edp', 'db');

      expect(rapidProUtils.getApiUri.callCount).to.equal(1);
      expect(rapidProUtils.getApiUri.args[0]).to.deep.equal(['edp']);

      expect(rapidProUtils.get.callCount).to.equal(4);
      expect(rapidProUtils.get.args).to.deep.equal([
        ['http://rapid.pro/api/v1/edp'],
        ['http://rapid.pro/api/v1/edp?p=2'],
        ['http://rapid.pro/api/v1/edp?p=3'],
        ['http://rapid.pro/api/v1/edp?p=4'],
      ]);
      expect(pgUtils.upsert.callCount).to.equal(4);
      expect(pgUtils.upsert.args).to.deep.equal([
        ['db', [['123', JSON.stringify({ uuid: '123', data: 'a', extra: 'b' })]]],
        ['db', [['456', JSON.stringify({ uuid: '456', data: 'aa', extra: 'bb' })]]],
        ['db', [['789', JSON.stringify({ uuid: '789', data: 'aaa', extra: 'bbb' })]]],
        ['db', [['101112', JSON.stringify({ uuid: '101112', data: 'aaaa', extra: 'bbbb' })]]],
      ]);
    });

    it('should throw error when get fails', async () => {
      sinon.stub(rapidProUtils, 'getApiUri').returns('http://rapid.pro/api/v1/contacts');
      sinon.stub(rapidProUtils, 'get')
        .onCall(0).resolves({
          results: [{ uuid: 'uuid', not_uuid: 54738593 }],
          next: 'http://rapid.pro/api/v1/contacts?page=2',
          previous: null,
        })
        .onCall(1).rejects({ some: 'err' });
      sinon.stub(pgUtils, 'upsert').resolves();

      try {
        await syncEndpoint.sync('contacts', 'contacts_db');
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'err' });

        expect(rapidProUtils.get.callCount).to.equal(2);
        expect(rapidProUtils.get.args[0]).to.deep.equal(['http://rapid.pro/api/v1/contacts']);
        expect(rapidProUtils.get.args[1]).to.deep.equal(['http://rapid.pro/api/v1/contacts?page=2']);
        expect(pgUtils.upsert.callCount).to.equal(1);
        expect(pgUtils.upsert.args[0]).to.deep.equal([
          'contacts_db',
          [ ['uuid', JSON.stringify({ uuid: 'uuid', not_uuid: 54738593 })] ],
        ]);
      }
    });

    it('should throw upsert fails', async () => {
      sinon.stub(rapidProUtils, 'getApiUri').returns('http://rapid.pro/api/v1/flows');
      sinon.stub(rapidProUtils, 'get')
        .onCall(0).resolves({
          results: [{ uuid: 'uuid', not_uuid: 54738593 }],
          next: 'http://rapid.pro/api/v1/flows?page=2',
          previous: null,
        })
        .onCall(1).resolves({
          results: [{ uuid: 'other', not_uuid: 78979 }],
          next: 'http://rapid.pro/api/v1/flows?page=3',
          previous: null,
        });
      sinon.stub(pgUtils, 'upsert')
        .onCall(0).resolves()
        .onCall(1).rejects({ some: 'other err' });

      try {
        await syncEndpoint.sync('flows', 'flows_db');
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'other err' });

        expect(rapidProUtils.get.callCount).to.equal(2);
        expect(rapidProUtils.get.args[0]).to.deep.equal(['http://rapid.pro/api/v1/flows']);
        expect(rapidProUtils.get.args[1]).to.deep.equal(['http://rapid.pro/api/v1/flows?page=2']);
        expect(pgUtils.upsert.callCount).to.equal(2);
        expect(pgUtils.upsert.args[0]).to.deep.equal([
          'flows_db',
          [ ['uuid', JSON.stringify({ uuid: 'uuid', not_uuid: 54738593 })] ],
        ]);
        expect(pgUtils.upsert.args[1]).to.deep.equal([
          'flows_db',
          [ ['other', JSON.stringify({ uuid: 'other', not_uuid: 78979 })] ],
        ]);
      }
    });
  });

});
