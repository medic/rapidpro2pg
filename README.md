# rapidpro2pg
Adapter that pulls data from RapidPro and makes it available in PostgreSQL for ease of analysis.

# Required database setup
PostgreSQL 9.6 and greater. The user passed in the postgres url needs to have full creation rights on the given database.

## Getting started
1. Clone the repository
2. Update environment variables and network mode in `docker-compose.yml`
  - `POSTGRESQL_URL` is the PostgreSQL url
  - `RAPIDPRO_URL` is the url of your RapidPro deployment  
  - `RAPIDPRO_AUTH` is the RapidPro API Token, without the prefix
3. Run `docker-compose up`
4. Run step 3 for subsequent updates

## RapidPro data
Currently, the adapter pulls, but not limited to the following data.
1. Contacts
2. Messages
3. Runs
4. Flows and definitions

## How it works
1. Runs migrations in `/migrations` to create `rapidpro_contacts, rapidpro_messages, rapidpro_runs` tables and corresponding materialized views `useview_*`
2. Fetches data from RapidPro API on the respective endpoints and inserts to the tables.
3. Each table has one column `doc`, similar to `couchdb` of couch2pg adapter, and one column with an id or uuid, uniquely identifying each row. 
4. Refreshes the three materialized views

## Notes/known issues
1. RapidPro API token refreshes periodically, hence the need for fresh builds for each new token.


## Running tests with docker-compose
Run linting, unit and integration tests with:

```shell
docker-compose -f ./test/test-compose.yml up --build --abort-on-container-exit
```

Some environment variables can be set:
- `INT_PG_HOST` postgres host, defaults to postgres
- `INT_PG_USER` postgres user, defaults to postgres. This user must be able to create databases on the given host.
- `INT_PG_PASS` user's password, defaults to none (system default)
- `INT_PG_DB` test database to use, defaults to `rapidpro2pgtest`
- `INT_RP_PORT` RapidPro mocked server port, defaults to 6594

Use this command to tear down the containers.
```shell
docker-compose -f ./test/test-compose.yml down --volumes
```

## References
The following RapidPro API end points are helpful to understand the tables and views created
1. [/api/v2/contacts](https://rapidpro.app.medicmobile.org/api/v2/contacts) - to list, create, update or delete contacts
2. [/api/v2/messages](https://rapidpro.app.medicmobile.org/api/v2/messages) - to list messages
3. [/api/v2/runs](https://rapidpro.app.medicmobile.org/api/v2/runs) - to list flow runs
3. [/api/v2/flows](https://rapidpro.app.medicmobile.org/api/v2/flows) - to list flows
3. [/api/v2/definitions](https://rapidpro.app.medicmobile.org/api/v2/definitions) - to list flow definitions

