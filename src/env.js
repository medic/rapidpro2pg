const log = require('loglevel');

const RAPIDPRO_URL = 'RAPIDPRO_URL';
const RAPIDPRO_AUTH = 'RAPIDPRO_AUTH';
const POSTGRESQL_URL = 'POSTGRESQL_URL';

const getEnv = (prop) => process.env[prop];

const requiredEnv = [RAPIDPRO_URL, RAPIDPRO_AUTH, POSTGRESQL_URL];

const validateEnv = () => {
  const errors = requiredEnv.filter(prop => {
    const value = getEnv(prop);
    if (!value) {
      log.error(`${prop} is required. Please run --usage to see required params`);
      return true;
    }

    if (prop === RAPIDPRO_URL) {
      try {
        new URL(value);
      } catch (err) {
        log.error(`${prop} is not a valid URL. `);
        return true;
      }
    }
  });
  return !errors.length;
};

module.exports = {
  getRapidProUrl: () => getEnv(RAPIDPRO_URL),
  getRapidProAuth: () => getEnv(RAPIDPRO_AUTH),
  getPostgresUrl: () => getEnv(POSTGRESQL_URL),
  validateEnv,
};
