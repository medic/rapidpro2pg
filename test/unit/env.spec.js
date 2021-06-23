const { expect } = require('chai');
const rewire = require('rewire');

const env = rewire('../../src/env');

describe('env', () => {
  let processObject;
  let revert;

  beforeEach(() => {
    processObject = { env: {} };
    revert = env.__set__('process', processObject);
  });

  afterEach(() => revert());

  it('getRapidProUrl should return env variable', () => {
    processObject.env.RAPIDPRO_URL = 'https://the.rapid.pro';
    expect(env.getRapidProUrl()).to.equal(processObject.env.RAPIDPRO_URL);
  });

  it('getRapidProAuth should return env variable', () => {
    processObject.env.RAPIDPRO_AUTH = 'omg token';
    expect(env.getRapidProAuth()).to.equal(processObject.env.RAPIDPRO_AUTH);
  });

  it('getPostgresUrl should return env variable', () => {
    processObject.env.POSTGRESQL_URL = 'postgres://couch2pg:secret=@localhost:5432/db';
    expect(env.getPostgresUrl()).to.equal(processObject.env.POSTGRESQL_URL);
  });

  describe('validateEnv', () => {
    it('should return true for valid env', () => {
      processObject.env.RAPIDPRO_URL = 'https://the.rapid.pro';
      processObject.env.RAPIDPRO_AUTH = 'omg token';
      processObject.env.POSTGRESQL_URL = 'postgres://couch2pg:secret=@localhost:5432/db';

      expect(env.validateEnv()).to.equal(true);
    });

    it('should return false when no rapidpro url is defined', () => {
      processObject.env.RAPIDPRO_AUTH = 'omg token';
      processObject.env.POSTGRESQL_URL = 'postgres://couch2pg:secret=@localhost:5432/db';

      expect(env.validateEnv()).to.equal(false);
    });

    it('should return false when no rapidpro auth is defined', () => {
      processObject.env.RAPIDPRO_URL = 'https://the.rapid.pro';
      processObject.env.POSTGRESQL_URL = 'postgres://couch2pg:secret=@localhost:5432/db';

      expect(env.validateEnv()).to.equal(false);
    });

    it('should return false when no postgressql url is defined', () => {
      processObject.env.RAPIDPRO_URL = 'https://the.rapid.pro';
      processObject.env.RAPIDPRO_AUTH = 'omg token';

      expect(env.validateEnv()).to.equal(false);
    });

    it('should return false for invalid rapidpro url', () => {
      processObject.env.RAPIDPRO_URL = 'not_url';
      processObject.env.RAPIDPRO_AUTH = 'omg token';
      processObject.env.POSTGRESQL_URL = 'postgres://couch2pg:secret=@localhost:5432/db';

      expect(env.validateEnv()).to.equal(false);
    });
  });
});
