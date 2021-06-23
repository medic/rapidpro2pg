CREATE TABLE IF NOT EXISTS rapidpro_messages (id bigint PRIMARY KEY, doc jsonb);
CREATE TABLE IF NOT EXISTS rapidpro_contacts (uuid uuid PRIMARY KEY, doc jsonb);
CREATE TABLE IF NOT EXISTS rapidpro_runs_progress (source VARCHAR PRIMARY KEY, timestamp VARCHAR);
CREATE TABLE IF NOT EXISTS rapidpro_runs (uuid uuid PRIMARY KEY, doc jsonb);

------------------------------------------------------------
----------------useview_rapidpro_contacts
------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS useview_rapidpro_contacts AS
(
	SELECT
		doc->>'uuid'::TEXT AS uuid,
		(doc#>>'{fields,medic_id}')::TEXT AS medic_id,
		(doc#>>'{fields,patient_readable_name}')::TEXT AS patient_readable_name,
		(doc#>>'{fields,timestamps_phone_owner}')::TEXT AS timestamps_phone_owner,
		doc->>'created_on'::TEXT AS created_on,
		doc->>'modified_on'::TEXT AS modified_on,
		doc->>'last_seen_on'::TEXT AS last_seen_on
	FROM
	rapidpro_contacts
);

DROP INDEX IF EXISTS  useview_rapidpro_contacts_uuid;
CREATE UNIQUE INDEX IF NOT EXISTS useview_rapidpro_contacts_uuid ON useview_rapidpro_contacts USING btree (uuid);

------------------------------------------------------------
----------------useview_rapidpro_messages
------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS useview_rapidpro_messages AS
(
	SELECT
		doc->>'id'::TEXT AS uuid,
		(doc#>>'{contact,uuid}')::TEXT AS contact_uuid,
		(doc#>>'{contact,name}')::TEXT AS contact_name,
		doc->>'urn'::TEXT AS urn,
		(doc#>>'{channel,uuid}')::TEXT AS channel_uuid,
		doc->>'direction'::TEXT AS direction,
		doc->>'status'::TEXT AS status,
		doc->>'text'::TEXT AS content,
		doc->>'created_on'::TEXT AS created_on,
		doc->>'sent_on'::TEXT AS sent_on,
		doc->>'modified_on'::TEXT AS modified_on
	FROM
	rapidpro_messages
);

DROP INDEX IF EXISTS  useview_rapidpro_messages_uuid;
CREATE UNIQUE INDEX IF NOT EXISTS useview_rapidpro_messages_uuid ON useview_rapidpro_messages USING btree (uuid);

------------------------------------------------------------
----------------useview_rapidpro_runs
------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS useview_rapidpro_runs AS
(
	SELECT
		doc->>'id'::TEXT AS uuid,
		(doc#>>'{contact,uuid}')::TEXT AS contact_uuid,
		(doc#>>'{contact,name}')::TEXT AS contact_name,
		(doc#>>'{flow,uuid}')::TEXT AS flow_uuid,
		(doc#>>'{flow,name}')::TEXT AS flow_name,
		doc->>'responded'::TEXT AS responded,
		doc->>'created_on'::TEXT AS created_on,
		doc->>'modified_on'::TEXT AS modified_on,
		doc->>'exited_on'::TEXT AS exited_on,
		doc->>'exit_type'::TEXT AS exit_type
	FROM
	rapidpro_runs
);

DROP INDEX IF EXISTS useview_rapidpro_runs_uuid;
CREATE UNIQUE INDEX IF NOT EXISTS useview_rapidpro_runs_uuid ON useview_rapidpro_runs USING btree (uuid);
