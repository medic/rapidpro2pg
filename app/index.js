const request = require('request-promise-native');
const Postgrator = require('postgrator');
const format = require('pg-format');
const {Client} = require('pg');

const parse = r => r && JSON.parse(r);
const post = async (url, data, headers={}) => await request.post(url, {body: JSON.stringify(data), headers: {'Content-Type': 'application/json', ...headers}});
const get = async (url, data, headers={}) => await request.get(url, {qs: data, headers: {'Content-Type': 'application/json', ...headers}});

var RAPIDPRO_URL = "https://textit.in";
var RAPIDPRO_AUTH = `Token ${process.env.rapidProAuth}`;

var [
  MESSAGES_URL,
  CONTACTS_URL,
  RUNS_URL,
  RAPIDPRO_HEADERS,
  PG_URL
] = [
  `${RAPIDPRO_URL}/api/v2/messages.json`,
  `${RAPIDPRO_URL}/api/v2/contacts.json`,
  `${RAPIDPRO_URL}/api/v2/runs.json`,
   { 'Authorization': RAPIDPRO_AUTH },
  process.env.pgUrl
];

const runMigrations = async () => {
  const migrator = new Postgrator({
    migrationDirectory: __dirname + '/migrations',
    driver: 'pg',
    connectionString: PG_URL,
    schemaTable: 'rapidpro2pg_migrations'
  });

  return migrator.migrate().then(console.log).catch(console.log);
};

const refreshMatViews = async () => {
  const migrator = new Postgrator({
    migrationDirectory: __dirname + '/refresh_matviews',
    driver: 'pg',
    connectionString: PG_URL,
    schemaTable: 'rapidpro2pg_progress'
  });

  return migrator.migrate().then(console.log).catch(console.log);
};

const runSQL = async (sql) => {
  const pg = new Client({connectionString: PG_URL});
  await pg.connect();
  await pg.query(sql);
  await pg.end();
};

const pgUpsertMessages = async (docs) => {
  const INSERT_STMT = 'INSERT INTO rapidpro_messages (id, doc) VALUES %L ON CONFLICT(id) DO UPDATE SET doc = EXCLUDED.doc';
  const sql = format(INSERT_STMT, docs);
  await runSQL(sql);
};

const pgUpsertContacts = async (docs) => {
  const INSERT_STMT = 'INSERT INTO rapidpro_contacts (uuid, doc) VALUES %L ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';
  const sql = format(INSERT_STMT, docs);
  await runSQL(sql);
};

const pgUpsertRuns = async (docs) => {
  const INSERT_STMT = 'INSERT INTO rapidpro_runs (uuid, doc) VALUES %L ON CONFLICT(uuid) DO UPDATE SET doc = EXCLUDED.doc';
  const sql = format(INSERT_STMT, docs);
  await runSQL(sql);
};

const loadMessages = (pageUrl, messages) => {
  console.log(`loading ${messages.length} from ${pageUrl}`);
  const docs = messages.map(message => {
    return [message.id, JSON.stringify(message)];
  });
  return pgUpsertMessages(docs);
};

const loadContacts = (pageUrl, contacts) => {
  console.log(`loading ${contacts.length} from ${pageUrl}`);
  const docs = contacts.map(contact => {
    return [contact.uuid, JSON.stringify(contact)];
  });
  return pgUpsertContacts(docs);
};

const loadRuns = (pageUrl, runs) => {
  console.log(`loading ${runs.length} from ${pageUrl}`);
  const docs = runs.map(run => {
    return [run.uuid, JSON.stringify(run)];
  });
  return pgUpsertRuns(docs);
};

const fetchAndLoadMessages = async () => {
  let next = MESSAGES_URL;
  let messagesCount = 0;
  let loadPromises = [];
  while(next) {
    console.log(`fetching from ${next} ...`);
    const page = parse(await get(next, null, RAPIDPRO_HEADERS));
    next = page.next;
    const fetched = page.results;
    console.log(`fetched ${fetched.length} messages`)
    messagesCount += fetched.length;
    loadPromises.push(loadMessages(next, fetched));
  }
  console.log(`found ${messagesCount} messages in total from rapidpro`);
  return Promise.all(loadPromises).then(() => console.log('completed loading all messages'));
};

const fetchAndLoadContacts = async () => {
  let next = CONTACTS_URL;
  let count = 0;
  let loadPromises = [];
  while(next) {
    console.log(`fetching from ${next} ...`);
    const page = parse(await get(next, null, RAPIDPRO_HEADERS));
    next = page.next;
    const fetched = page.results;
    console.log(`fetched ${fetched.length} contacts`)
    count += fetched.length;
    loadPromises.push(loadContacts(next, fetched));
  }
  console.log(`found ${count} contacts in total from rapidpro`);
  return Promise.all(loadPromises).then(() => console.log('completed loading all contacts'));
};

const fetchAndLoadRuns = async () => {
  let next = RUNS_URL;
  let count = 0;
  let loadPromises = [];
  while(next) {
    console.log(`fetching from ${next} ...`);
    const page = parse(await get(next, null, RAPIDPRO_HEADERS));
    next = page.next;
    const fetched = page.results;
    console.log(`fetched ${fetched.length} runs`)
    count += fetched.length;
    loadPromises.push(loadRuns(next, fetched));
  }
  console.log(`found ${count} runs in total from rapidpro`);
  return Promise.all(loadPromises).then(() => console.log('completed loading all runs'));
};

(async () => {
  await runMigrations();
  await fetchAndLoadMessages();
  await fetchAndLoadContacts();
  await fetchAndLoadRuns();
  await refreshMatViews();
})();
