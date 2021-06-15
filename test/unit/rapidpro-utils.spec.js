const sinon = require('sinon');
const { expect, assert } = require('chai');
const rewire = require('rewire');

const rapidProUtils = rewire('../../src/rapidpro-utils');
const env = require('../../src/env');

describe('rapidpro-utils', () => {
  let fetch;
  let res;
  let revert;

  beforeEach(() => {
    res = { json: sinon.stub() };
    fetch = sinon.stub().resolves(res);
    revert = rapidProUtils.__set__('fetch', fetch);
    sinon.stub(env, 'getRapidProUrl');
    sinon.stub(env, 'getRapidProAuth');
  });

  afterEach(() => {
    sinon.restore();
    revert();
  });

  describe('getApiUri', () => {
    it('should return the url for the requested endpoint', () => {
      env.getRapidProUrl.returns('https://rapid.pro');

      const contactsUrl = rapidProUtils.getApiUri('contacts');
      expect(contactsUrl).to.equal('https://rapid.pro/api/v2/contacts.json');

      const runsUrl = rapidProUtils.getApiUri('runs');
      expect(runsUrl).to.equal('https://rapid.pro/api/v2/runs.json');

      const flowsUrl = rapidProUtils.getApiUri('flows');
      expect(flowsUrl).to.equal('https://rapid.pro/api/v2/flows.json');
    });
  });

  describe('get', () => {
    it('should request provided url and return response', async () => {
      const url = 'https://rapid.pro/api/v2/contacts.json';
      res.json.resolves('the result');
      env.getRapidProAuth.returns('the token');

      const actual = await rapidProUtils.get(url);
      expect(actual).to.equal('the result');

      expect(fetch.callCount).to.equal(1);
      expect(fetch.args[0]).to.deep.equal([
        url,
        { method: 'GET', headers: { Authorization: 'Token the token' } },
      ]);
      expect(res.json.callCount).to.equal(1);
    });

    it('should throw fetch errors', async () => {
      const url = 'https://rapid.pro/api/v2/flows.json';
      env.getRapidProAuth.returns('a_token');
      fetch.rejects({ some: 'error' });

      try {
        await rapidProUtils.get(url);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
        expect(fetch.callCount).to.equal(1);
        expect(fetch.args[0]).to.deep.equal([
          url,
          { method: 'GET', headers: { Authorization: 'Token a_token' } },
        ]);
        expect(res.json.callCount).to.equal(0);
      }
    });

    it('should throw json errors', async () => {
      const url = 'https://rapid.pro/api/v2/flows.json';
      env.getRapidProAuth.returns('not_token');
      res.json.rejects({ the: 'error' });

      try {
        await rapidProUtils.get(url);
        assert.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ the: 'error' });
        expect(fetch.callCount).to.equal(1);
        expect(fetch.args[0]).to.deep.equal([
          url,
          { method: 'GET', headers: { Authorization: 'Token not_token' } },
        ]);
        expect(res.json.callCount).to.equal(1);
      }
    });
  });
});
