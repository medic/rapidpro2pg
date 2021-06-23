const sinon = require('sinon');
const { expect, assert } = require('chai');

const rapidProUtils = require('../../../src/rapidpro-utils');
const utils = require('../../../src/endpoints/utils');

describe('endpoint utils', () => {
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
      const upsert = sinon.stub();

      await utils.sync('theEndpoint', upsert);

      expect(rapidProUtils.getApiUri.callCount).to.equal(1);
      expect(rapidProUtils.getApiUri.args[0]).to.deep.equal(['theEndpoint', '']);
      expect(rapidProUtils.get.callCount).to.equal(1);
      expect(rapidProUtils.get.args[0]).to.deep.equal(['http://rapid.pro/api/v1/theEndpoint']);
      expect(upsert.callCount).to.equal(1);
      expect(upsert.args[0]).to.deep.equal([
        [
          { uuid: '123', data: 'a', extra: 'b' },
          { uuid: '456', data: 'aa', extra: 'bb' },
          { uuid: '789', data: 'aaa', extra: 'bbb' },
          { uuid: '101112', data: 'aaaa', extra: 'bbbb' },
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
      const upsert = sinon.stub().resolves();

      await utils.sync('edp', upsert);

      expect(rapidProUtils.getApiUri.callCount).to.equal(1);
      expect(rapidProUtils.getApiUri.args[0]).to.deep.equal(['edp', '']);

      expect(rapidProUtils.get.callCount).to.equal(4);
      expect(rapidProUtils.get.args).to.deep.equal([
        ['http://rapid.pro/api/v1/edp'],
        ['http://rapid.pro/api/v1/edp?p=2'],
        ['http://rapid.pro/api/v1/edp?p=3'],
        ['http://rapid.pro/api/v1/edp?p=4'],
      ]);
      expect(upsert.callCount).to.equal(4);
      expect(upsert.args).to.deep.equal([
        [[{ uuid: '123', data: 'a', extra: 'b' }]],
        [[{ uuid: '456', data: 'aa', extra: 'bb' }]],
        [[{ uuid: '789', data: 'aaa', extra: 'bbb' }]],
        [[{ uuid: '101112', data: 'aaaa', extra: 'bbbb' }]],
      ]);
    });

    it('should pass query params to get url', async () => {
      sinon.stub(rapidProUtils, 'getApiUri').returns('http://rapid.pro/api/v1/edp?qs=true');
      sinon.stub(rapidProUtils, 'get').resolves({
        results: [
          { uuid: '123', data: 'a', extra: 'b' },
          { uuid: '456', data: 'aa', extra: 'bb' },
        ],
        next: null,
        previous: null,
      });
      const upsert = sinon.stub().resolves();

      await utils.sync('edp', upsert, 'qs=true');

      expect(rapidProUtils.getApiUri.callCount).to.equal(1);
      expect(rapidProUtils.getApiUri.args[0]).to.deep.equal(['edp', 'qs=true']);
      expect(rapidProUtils.get.callCount).to.equal(1);
      expect(rapidProUtils.get.args[0]).to.deep.equal(['http://rapid.pro/api/v1/edp?qs=true']);
      expect(upsert.callCount).to.equal(1);
      expect(upsert.args[0]).to.deep.equal([
        [
          { uuid: '123', data: 'a', extra: 'b' },
          { uuid: '456', data: 'aa', extra: 'bb' },
        ]
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
      const upsert = sinon.stub().resolves();

      try {
        await utils.sync('contacts', upsert);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'err' });

        expect(rapidProUtils.get.callCount).to.equal(2);
        expect(rapidProUtils.get.args[0]).to.deep.equal(['http://rapid.pro/api/v1/contacts']);
        expect(rapidProUtils.get.args[1]).to.deep.equal(['http://rapid.pro/api/v1/contacts?page=2']);
        expect(upsert.callCount).to.equal(1);
        expect(upsert.args[0]).to.deep.equal([
          [ { uuid: 'uuid', not_uuid: 54738593 } ],
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
      const upsert = sinon.stub()
        .onCall(0).resolves()
        .onCall(1).rejects({ some: 'other err' });

      try {
        await utils.sync('flows', upsert);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'other err' });

        expect(rapidProUtils.get.callCount).to.equal(2);
        expect(rapidProUtils.get.args[0]).to.deep.equal(['http://rapid.pro/api/v1/flows']);
        expect(rapidProUtils.get.args[1]).to.deep.equal(['http://rapid.pro/api/v1/flows?page=2']);
        expect(upsert.callCount).to.equal(2);
        expect(upsert.args[0]).to.deep.equal([ [{ uuid: 'uuid', not_uuid: 54738593 }]]);
        expect(upsert.args[1]).to.deep.equal([[ { uuid: 'other', not_uuid: 78979 } ]]);
      }
    });
  });

});
