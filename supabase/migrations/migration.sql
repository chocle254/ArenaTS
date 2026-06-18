-- ============================================================
-- SECTION: ROLES
-- ============================================================

--
-- PostgreSQL database cluster dump
--

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

-- CREATE ROLE "anon";
-- ALTER ROLE "anon" WITH INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
-- CREATE ROLE "authenticated";
-- ALTER ROLE "authenticated" WITH INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
-- CREATE ROLE "authenticator";
-- ALTER ROLE "authenticator" WITH NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:0sprsu9c9SNdnHtuiIolEg==$P9harhOlBJGeTG9KSHkOPvWCZ2NEs7dbT4PCmvUFvQA=:R0RskWbLBq4TuYOy3TA8W7CZAQG9YisyKn8eUf+P4oY=';
-- CREATE ROLE "dashboard_user";
-- ALTER ROLE "dashboard_user" WITH INHERIT CREATEROLE CREATEDB NOLOGIN REPLICATION NOBYPASSRLS;
-- CREATE ROLE "pgbouncer";
-- ALTER ROLE "pgbouncer" WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:Fa8Qjcegm36TmYQ9Ye6m/g==$l0MWykX/hZKf4Wo2JNSsQdRqlzqkt4cXGshnztzGAsM=:wvRqwzcpaS1iEpbDyEX7NDy6m35yAbMMOYn0++iSWvk=';
-- CREATE ROLE "postgres";
-- ALTER ROLE "postgres" WITH INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:BwproGkAuyF3WQVnBqXo8Q==$IOYMMfpavLKZSd/i+l5TWlp7yxVhmPqsCXbWT4Shcu4=:NRDXyYVC4rMKUYcynqSVqE2HP/3m20HCJST5k0e0h/0=';
-- CREATE ROLE "service_role";
-- ALTER ROLE "service_role" WITH INHERIT NOCREATEROLE NOCREATEDB NOLOGIN BYPASSRLS;
-- CREATE ROLE "supabase_admin";
-- ALTER ROLE "supabase_admin" WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:yGdEl5TKUVqm9YU+L61kcQ==$RfDzEatM7DV35is5VtCSqpLMZVTe22lR2ZkodbaSFw8=:VKhm9Mburxe8wIjqZf9IMNwdgC1St4xPUA9qgHQxw1Q=';
-- CREATE ROLE "supabase_auth_admin";
-- ALTER ROLE "supabase_auth_admin" WITH NOINHERIT CREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:z5nFBjLkj9oqPjCAC4tHrA==$rfxKVzVITHqGkvqQlHLSN8KeoX9wc3DxIRC0elBZ1WI=:qDDkY6hTe5z675QxR0wsOOhPvcCr4DatmrSSzr1hsEA=';
-- CREATE ROLE "supabase_etl_admin";
-- ALTER ROLE "supabase_etl_admin" WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:5fPcZw5dWCD4Gg3n+sA25w==$/kbXJnPw9u6L139SfKF1CS2Z1f5t5TezfZ/G87sh5h0=:pefQeZ2lOwt1J/n8pekQMLtPkqXhb5+Z4FxVm8IQra4=';
-- CREATE ROLE "supabase_privileged_role";
-- ALTER ROLE "supabase_privileged_role" WITH INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
-- CREATE ROLE "supabase_read_only_user";
-- ALTER ROLE "supabase_read_only_user" WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:ZvygWH6I9voBV8MLAI7LKg==$lJL/BVUIiHlRznx2EOvapGkQEMdwyiqpoll6eDWdID4=:0RQYoue4F1ULcbQPE7eH3rgqgODMS3jCzd5uRbBZSC4=';
-- CREATE ROLE "supabase_realtime_admin";
-- ALTER ROLE "supabase_realtime_admin" WITH NOINHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
-- CREATE ROLE "supabase_replication_admin";
-- ALTER ROLE "supabase_replication_admin" WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN REPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:5xLw0jdiyMGt+6SXX8YEwg==$M/5TpUpYLhPkuhz3tikVwFMNnVtvbEnMMW2ZrU8mreU=:+SvR7/4i0lCzmiNc6sBOLxQQqJ82MqUK59U1SiiRn9U=';
-- CREATE ROLE "supabase_storage_admin";
-- ALTER ROLE "supabase_storage_admin" WITH NOINHERIT CREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:G428eJMMKMkKsoz9ttylDA==$fGgydKgDA0IDqg7a5RFA5BD+n1lBvkZPEtyZraxzvck=:1CRd6bFXlRDJW8HcJK2spzrmdDJwo3GCuTwbWEeGiPg=';

--
-- User Configurations
--

--
-- User Config "anon"
--

ALTER ROLE "anon" SET "statement_timeout" TO '3s';

--
-- User Config "authenticated"
--

ALTER ROLE "authenticated" SET "statement_timeout" TO '8s';

--
-- User Config "authenticator"
--

-- ALTER ROLE "authenticator" SET "session_preload_libraries" TO 'safeupdate';
ALTER ROLE "authenticator" SET "statement_timeout" TO '8s';
-- ALTER ROLE "authenticator" SET "lock_timeout" TO '8s';

--
-- User Config "postgres"
--

-- ALTER ROLE "postgres" SET "search_path" TO E'\\$user', 'public', 'extensions';

--
-- User Config "supabase_admin"
--

-- ALTER ROLE "supabase_admin" SET "search_path" TO '$user', 'public', 'auth', 'extensions';
-- ALTER ROLE "supabase_admin" SET "log_statement" TO 'none';

--
-- User Config "supabase_auth_admin"
--

-- ALTER ROLE "supabase_auth_admin" SET "search_path" TO 'auth';
-- ALTER ROLE "supabase_auth_admin" SET "idle_in_transaction_session_timeout" TO '60000';
-- ALTER ROLE "supabase_auth_admin" SET "log_statement" TO 'none';

--
-- User Config "supabase_read_only_user"
--

-- ALTER ROLE "supabase_read_only_user" SET "default_transaction_read_only" TO 'on';

--
-- User Config "supabase_storage_admin"
--

-- ALTER ROLE "supabase_storage_admin" SET "search_path" TO 'storage';
-- ALTER ROLE "supabase_storage_admin" SET "log_statement" TO 'none';

--
-- Role memberships
--

-- GRANT "anon" TO "authenticator" WITH INHERIT FALSE GRANTED BY "supabase_admin";
-- GRANT "anon" TO "postgres" WITH ADMIN OPTION, INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "authenticated" TO "authenticator" WITH INHERIT FALSE GRANTED BY "supabase_admin";
-- GRANT "authenticated" TO "postgres" WITH ADMIN OPTION, INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "authenticator" TO "postgres" WITH ADMIN OPTION, INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "authenticator" TO "supabase_storage_admin" WITH INHERIT FALSE GRANTED BY "supabase_admin";
-- GRANT "pg_create_subscription" TO "postgres" WITH ADMIN OPTION, INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_monitor" TO "postgres" WITH ADMIN OPTION, INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_monitor" TO "supabase_etl_admin" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_monitor" TO "supabase_read_only_user" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_read_all_data" TO "postgres" WITH ADMIN OPTION, INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_read_all_data" TO "supabase_etl_admin" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_read_all_data" TO "supabase_read_only_user" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_signal_backend" TO "postgres" WITH ADMIN OPTION, INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "service_role" TO "authenticator" WITH INHERIT FALSE GRANTED BY "supabase_admin";
-- GRANT "service_role" TO "postgres" WITH ADMIN OPTION, INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "supabase_privileged_role" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "supabase_privileged_role" TO "supabase_etl_admin" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "supabase_realtime_admin" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";

--
-- PostgreSQL database cluster dump complete
--


-- ============================================================
-- SECTION: SCHEMA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "auth";


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "extensions";


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "graphql";


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "graphql_public";


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "pgbouncer";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "realtime";


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "storage";


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "supabase_migrations";


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "vault";


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pg_stat_statements"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_stat_statements" IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";


--
-- Name: EXTENSION "pg_trgm"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_trgm" IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: bracket_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."bracket_type" AS ENUM (
    'single_elimination',
    'double_elimination',
    'round_robin'
);


--
-- Name: dispute_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."dispute_status" AS ENUM (
    'open',
    'reviewing',
    'resolved'
);


--
-- Name: dispute_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."dispute_type" AS ENUM (
    'wrong_score',
    'cheating',
    'no_show',
    'technical_issue'
);


--
-- Name: game_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."game_type" AS ENUM (
    'codm',
    'fortnite',
    'fifa',
    'warzone',
    'apex',
    'valorant',
    'injustice',
    'mortal_kombat',
    'efootball',
    'pubg_mobile'
);


--
-- Name: match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."match_status" AS ENUM (
    'upcoming',
    'live',
    'completed',
    'disputed'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'completed',
    'cancelled',
    'refunded'
);


--
-- Name: payout_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."payout_status" AS ENUM (
    'pending',
    'approved',
    'sent',
    'failed',
    'rejected'
);


--
-- Name: tournament_format; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."tournament_format" AS ENUM (
    'solo',
    'duo',
    'squad'
);


--
-- Name: tournament_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."tournament_status" AS ENUM (
    'open',
    'active',
    'completed',
    'cancelled',
    'live'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."transaction_type" AS ENUM (
    'credit',
    'debit',
    'withdrawal',
    'refund',
    'payout',
    'deposit',
    'tournament_win',
    'tournament_fee',
    'challenge_fee',
    'challenge_win'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'admin',
    'referee'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."action" AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."equality_op" AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."user_defined_filter" AS (
	"column_name" "text",
	"op" "realtime"."equality_op",
	"value" "text"
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."wal_column" AS (
	"name" "text",
	"type_name" "text",
	"type_oid" "oid",
	"value" "jsonb",
	"is_pkey" boolean,
	"is_selectable" boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."wal_rls" AS (
	"wal" "jsonb",
	"is_rls_enabled" boolean,
	"subscription_ids" "uuid"[],
	"errors" "text"[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION "email"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION "role"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION "uid"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_cron_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION "grant_pg_cron_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_cron_access"() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_graphql_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION "grant_pg_graphql_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_graphql_access"() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_net_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION "grant_pg_net_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_net_access"() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."pgrst_ddl_watch"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."pgrst_drop_watch"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."set_graphql_placeholder"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION "set_graphql_placeholder"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."set_graphql_placeholder"() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql("text", "text", "jsonb", "jsonb"); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION "graphql_public"."graphql"("operationName" "text" DEFAULT NULL::"text", "query" "text" DEFAULT NULL::"text", "variables" "jsonb" DEFAULT NULL::"jsonb", "extensions" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth("text"); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION "pgbouncer"."get_auth"("p_usename" "text") RETURNS TABLE("username" "text", "password" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: _update_match_results_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."_update_match_results_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: admin_override_match("uuid", "text", integer, "uuid", "uuid", "uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."admin_override_match"("p_tournament_id" "uuid", "p_match_id" "text", "p_round" integer, "p_player1_id" "uuid", "p_player2_id" "uuid", "p_winner_id" "uuid", "p_admin_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing match_results%ROWTYPE;
BEGIN
  -- Upsert: create row if missing, do nothing if exists
  INSERT INTO match_results (
    tournament_id, match_id, round,
    player1_id, player2_id,
    winner_id, status,
    admin_override, submitted_by
  )
  VALUES (
    p_tournament_id, p_match_id, p_round,
    p_player1_id, p_player2_id,
    p_winner_id, 'confirmed',
    true, p_admin_id
  )
  ON CONFLICT (tournament_id, match_id) DO NOTHING;

  -- Fetch the single guaranteed row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  -- Force confirm by primary key
  UPDATE match_results
  SET
    winner_id      = p_winner_id,
    status         = 'confirmed',
    admin_override = true,
    submitted_by   = p_admin_id,
    updated_at     = now()
  WHERE id = v_existing.id;

  RETURN json_build_object(
    'status', 'confirmed',
    'message', 'Admin override applied successfully.'
  );
END;
$$;


--
-- Name: advance_winner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."advance_winner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_match_number      integer;
  v_next_round        integer;
  v_next_match_number integer;
  v_next_match_id     text;
  v_num_rounds        integer;
  v_tournament_mode   text;
  v_winner_team_id    uuid;
  v_next_match        match_results%ROWTYPE;
  v_other_player_id   uuid;
BEGIN
  -- Only act when a match transitions to confirmed WITH a winner
  -- (double no-show produces winner_id=NULL — handled separately)
  IF NEW.status != 'confirmed'
     OR OLD.status = 'confirmed'
     OR NEW.winner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Parse match number from 'r{round}-m{number}'
  v_match_number      := SUBSTRING(NEW.match_id FROM 'm(\d+)$')::integer;
  v_next_round        := NEW.round + 1;
  v_next_match_number := v_match_number / 2;
  v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;

  SELECT num_rounds, mode
  INTO v_num_rounds, v_tournament_mode
  FROM tournaments
  WHERE id = NEW.tournament_id;

  -- ── Tournament complete ──────────────────────────────────────────────────
  IF v_next_round > v_num_rounds THEN
    -- This was the grand final — crown the winner
    UPDATE tournaments
    SET status       = 'completed',
        winner_id    = NEW.winner_id,
        completed_at = now()
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  END IF;

  -- ── Resolve winner's team (team mode only) ───────────────────────────────
  IF v_tournament_mode = 'team' THEN
    SELECT team_id INTO v_winner_team_id
    FROM tournament_participants
    WHERE tournament_id = NEW.tournament_id
      AND user_id = NEW.winner_id
    LIMIT 1;
  END IF;

  -- ── Read current state of the next match ────────────────────────────────
  -- We do this BEFORE the UPDATE so we can see whether the other slot
  -- already has a player. This is the fix for the deadline-stays-NULL bug.
  SELECT * INTO v_next_match
  FROM match_results
  WHERE tournament_id = NEW.tournament_id
    AND match_id      = v_next_match_id;

  IF NOT FOUND THEN
    -- Should never happen after the two-pass generation, but guard anyway
    RAISE WARNING 'advance_winner: target match % not found for tournament %',
      v_next_match_id, NEW.tournament_id;
    RETURN NEW;
  END IF;

  -- ── Place winner and conditionally activate check-in ─────────────────────
  IF v_match_number % 2 = 0 THEN
    -- Even match → winner fills player1 slot
    -- Deadline activates if player2 is already waiting
    v_other_player_id := v_next_match.player2_id;

    UPDATE match_results
    SET player1_id         = NEW.winner_id,
        team1_id           = v_winner_team_id,
        player1_checked_in = false,
        both_players_ready = false,
        check_in_deadline  = CASE
                               WHEN v_other_player_id IS NOT NULL
                               THEN now() + interval '5 minutes'
                               ELSE check_in_deadline   -- keep NULL until both slots filled
                             END
    WHERE tournament_id = NEW.tournament_id
      AND match_id      = v_next_match_id;

  ELSE
    -- Odd match → winner fills player2 slot
    -- Deadline activates if player1 is already waiting
    v_other_player_id := v_next_match.player1_id;

    UPDATE match_results
    SET player2_id         = NEW.winner_id,
        team2_id           = v_winner_team_id,
        player2_checked_in = false,
        both_players_ready = false,
        check_in_deadline  = CASE
                               WHEN v_other_player_id IS NOT NULL
                               THEN now() + interval '5 minutes'
                               ELSE check_in_deadline
                             END
    WHERE tournament_id = NEW.tournament_id
      AND match_id      = v_next_match_id;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: advance_winner_to_next_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."advance_winner_to_next_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_next_round         integer;
  v_next_match_number  integer;
  v_next_match_id      text;
  v_match_number       integer;
  v_is_player1         boolean;
  v_winner_team_id     uuid;
BEGIN
  IF NEW.status = 'confirmed'
    AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'confirmed')
    AND NEW.winner_id IS NOT NULL
  THEN
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;

    v_match_number      := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round        := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;
    v_is_player1        := (v_match_number % 2 = 0);

    -- Get winner team id if applicable
    IF NEW.team1_id IS NOT NULL OR NEW.team2_id IS NOT NULL THEN
      v_winner_team_id := CASE WHEN NEW.winner_id = NEW.player1_id THEN NEW.team1_id WHEN NEW.winner_id = NEW.player2_id THEN NEW.team2_id ELSE NULL END;
    ELSE
      v_winner_team_id := NULL;
    END IF;

    -- Update the next match with the winner
    UPDATE match_results SET
      player1_id = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
      player2_id = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
      team1_id = CASE WHEN v_is_player1 THEN v_winner_team_id ELSE team1_id END,
      team2_id = CASE WHEN NOT v_is_player1 THEN v_winner_team_id ELSE team2_id END,
      updated_at = now()
    WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_start_challenge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."auto_start_challenge"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN

  -- Only set check-in deadline when BOTH players are present.
  -- In challenges, they are usually both present from the start once 'accepted',
  -- but we'll follow the same logic for consistency.
  IF NEW.status = 'accepted' AND NEW.check_in_deadline IS NULL
    AND NEW.challenger_id IS NOT NULL
    AND NEW.opponent_id IS NOT NULL
  THEN
    NEW.check_in_deadline := now() + interval '5 minutes';
  END IF;

  -- Only start match timer when both players have checked in
  IF NEW.status = 'accepted' 
    AND NEW.challenger_checked_in 
    AND NEW.opponent_checked_in 
    AND NEW.match_started_at IS NULL 
  THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + interval '30 minutes';
    NEW.both_players_ready := true;
  END IF;

  RETURN NEW;

END;
$$;


--
-- Name: auto_start_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."auto_start_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Set check-in deadline when BOTH players are present and it hasn't been set yet.
  IF NEW.check_in_deadline IS NULL
    AND (NEW.player1_id IS NOT NULL OR NEW.team1_id IS NOT NULL)
    AND (NEW.player2_id IS NOT NULL OR NEW.team2_id IS NOT NULL)
  THEN
    NEW.check_in_deadline := now() + interval '5 minutes';
    NEW.check_in_started_at := now();
  END IF;

  -- Only start match timer when both players have checked in
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND NEW.match_started_at IS NULL THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
    NEW.both_players_ready := true;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: broadcast_tournament_completion("uuid", "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."broadcast_tournament_completion"("p_tournament_id" "uuid", "p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Use pg_notify to send the broadcast
  -- The channel name matches what clients subscribe to
  PERFORM pg_notify(
    'tournament_complete_' || p_tournament_id::text,
    p_payload::text
  );
  
  RAISE NOTICE 'Broadcast sent for tournament: %', p_tournament_id;
END;
$$;


--
-- Name: calculate_challenge_prize(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."calculate_challenge_prize"("stake" numeric) RETURNS TABLE("prize_pool" numeric, "platform_fee" numeric)
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (stake * 2 * 0.9)::numeric(10, 2) as prize_pool,
    (stake * 2 * 0.1)::numeric(10, 2) as platform_fee;
END;
$$;


--
-- Name: calculate_prize_pool("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."calculate_prize_pool"("p_tournament_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_prize_pool numeric;
BEGIN
  SELECT prize_pool INTO v_prize_pool FROM tournaments WHERE id = p_tournament_id;
  RETURN v_prize_pool;
END;
$$;


--
-- Name: can_access_dm("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_access_dm"("msg_sender_id" "uuid", "msg_receiver_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() = msg_sender_id OR auth.uid() = msg_receiver_id;
END;
$$;


--
-- Name: check_and_cancel_insufficient_tournaments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_and_cancel_insufficient_tournaments"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tournament record;
BEGIN
  -- Find tournaments starting in the next 5 minutes that are still 'open' and have < min_participants
  -- Or tournaments that just started but didn't reach min_participants
  FOR v_tournament IN 
    SELECT id, name, current_players, min_participants
    FROM tournaments
    WHERE status = 'open' 
      AND start_time <= now() + interval '1 minute'
      AND current_players < min_participants
  LOOP
    -- Cancel the tournament
    UPDATE tournaments 
    SET status = 'cancelled', updated_at = now()
    WHERE id = v_tournament.id;
    
    -- Refund fees
    PERFORM refund_tournament_entry_fees(v_tournament.id);
    
    RAISE NOTICE 'Cancelled tournament % due to insufficient participants (%/%)', v_tournament.name, v_tournament.current_players, v_tournament.min_participants;
  END LOOP;
END;
$$;


--
-- Name: check_and_update_tournament_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_and_update_tournament_status"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1. Generate brackets for tournaments starting soon
  PERFORM generate_tournament_brackets();

  -- 2. Start tournaments that have reached start time
  -- Note: generate_tournament_brackets already sets status to 'active' for tournaments it processes,
  -- but this handles cases where bracket was generated but status was still 'open' (if any).
  UPDATE tournaments
  SET status = 'active'
  WHERE status = 'open'
    AND bracket_generated = true
    AND start_time <= now()
    AND current_players >= min_participants;

  -- 3. Enforce check-in deadlines
  -- Changed from enforce_check_in_deadlines() to process_expired_check_ins()
  PERFORM process_expired_check_ins();

  -- 4. Cancel tournaments that didn't meet minimum participants
  UPDATE tournaments
  SET status = 'cancelled'
  WHERE status = 'open'
    AND start_time <= now()
    AND current_players < min_participants;

  -- 5. Complete tournaments where all matches are confirmed
  UPDATE tournaments t
  SET status = 'completed',
      updated_at = now()
  WHERE t.status = 'active'
    AND EXISTS (SELECT 1 FROM match_results mr WHERE mr.tournament_id = t.id)
    AND NOT EXISTS (
      SELECT 1 FROM match_results mr 
      WHERE mr.tournament_id = t.id 
        AND mr.status != 'confirmed'
    );

  -- 6. Refund cancelled tournaments (if not already refunded)
  PERFORM refund_tournament_entry_fees(id)
  FROM tournaments
  WHERE status = 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE tournament_id = tournaments.id 
        AND type = 'refund'
    );
END;
$$;


--
-- Name: check_for_tournament_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_for_tournament_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_max_round   integer;
  v_final_match text;
BEGIN
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
  THEN
    -- Final match is always the highest round, match index 0
    SELECT MAX(round) INTO v_max_round
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    v_final_match := 'r' || v_max_round || '-m0';

    -- Only complete the tournament if THIS match is the final
    IF NEW.match_id = v_final_match AND NEW.winner_id IS NOT NULL THEN
      UPDATE tournaments
      SET
        status    = 'completed',
        winner_id = NEW.winner_id
      WHERE id = NEW.tournament_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_tournament_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_tournament_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_num_rounds integer;
  v_final_match_id text;
  v_all_confirmed boolean;
BEGIN
  -- Only process when status becomes confirmed
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    
    -- Get num_rounds from tournaments table
    SELECT num_rounds INTO v_num_rounds
    FROM tournaments
    WHERE id = NEW.tournament_id;

    -- Build final match ID
    v_final_match_id := 'r' || v_num_rounds || '-m0';

    -- Check all three conditions:
    -- 1. This is the final match
    -- 2. Winner is set
    -- 3. All matches are confirmed
    IF NEW.match_id = v_final_match_id AND NEW.winner_id IS NOT NULL THEN
      
      -- Check if all matches are confirmed
      SELECT NOT EXISTS(
        SELECT 1
        FROM match_results
        WHERE tournament_id = NEW.tournament_id
          AND status != 'confirmed'
      ) INTO v_all_confirmed;

      IF v_all_confirmed THEN
        -- Tournament is complete
        UPDATE tournaments
        SET status = 'completed',
            winner_id = NEW.winner_id,
            ended_at = NOW()
        WHERE id = NEW.tournament_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: cleanup_old_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."cleanup_old_rate_limits"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;


--
-- Name: complete_tournament_flow("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."complete_tournament_flow"("p_tournament_id" "uuid", "p_winner_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_tournament record;
  v_winner record;
  v_runner_up record;
  v_platform_fee numeric;
  v_net_prize numeric;
  v_total_entry_fees numeric;
  v_creator_cut numeric;
  v_participant_count integer;
  v_tournament_duration interval;
  v_result jsonb;
BEGIN
  -- Step 1: Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Prevent double execution
  IF v_tournament.status = 'completed' AND v_tournament.prizes_distributed = true THEN
    RAISE NOTICE 'Tournament already completed and prizes distributed';
    RETURN jsonb_build_object('success', false, 'message', 'Already completed');
  END IF;

  -- Step 2: Update tournament status
  UPDATE tournaments 
  SET 
    status = 'completed',
    winner_id = p_winner_id,
    ended_at = NOW()
  WHERE id = p_tournament_id;

  RAISE NOTICE 'Step 2: Tournament status updated to completed';

  -- Get updated tournament with ended_at
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  -- Calculate tournament duration
  IF v_tournament.started_at IS NOT NULL THEN
    v_tournament_duration := v_tournament.ended_at - v_tournament.started_at;
  ELSE
    v_tournament_duration := interval '0';
  END IF;

  -- Get winner details
  SELECT id, gamertag, avatar_url INTO v_winner 
  FROM profiles WHERE id = p_winner_id;

  -- Get runner-up (loser of final match)
  SELECT p.id, p.gamertag, p.avatar_url INTO v_runner_up
  FROM match_results mr
  JOIN profiles p ON (p.id = mr.player1_id OR p.id = mr.player2_id) AND p.id != p_winner_id
  WHERE mr.tournament_id = p_tournament_id 
    AND mr.status = 'confirmed'
  ORDER BY mr.round DESC
  LIMIT 1;

  -- Count participants
  SELECT COUNT(*) INTO v_participant_count 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  -- Step 3: Distribute prize pool to winner
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  IF v_net_prize > 0 THEN
    UPDATE profiles
    SET 
      arena_currency = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize,
      total_earnings = COALESCE(total_earnings, 0) + v_net_prize,
      rating = LEAST(rating + 0.5, 10.0) -- Significant rating boost for tournament win
    WHERE id = p_winner_id;
    
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      p_winner_id, 
      'payout', 
      v_net_prize, 
      'Tournament prize for winning: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    RAISE NOTICE 'Step 3: Prize pool distributed to winner: %', v_net_prize;
  END IF;

  -- Step 4: Send entry fees to tournament creator (10% of total entry fees)
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  v_creator_cut := v_total_entry_fees * 0.10;

  IF v_creator_cut > 0 THEN
    UPDATE profiles
    SET 
      arena_currency = COALESCE(arena_currency, 0) + v_creator_cut,
      available_balance = COALESCE(available_balance, 0) + v_creator_cut
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 
      'payout', 
      v_creator_cut, 
      'Creator fee (10%) for tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    RAISE NOTICE 'Step 4: Creator fee sent: %', v_creator_cut;
  END IF;

  -- Add platform fee to maintenance balance
  IF v_platform_fee > 0 THEN
    UPDATE platform_settings
    SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
  END IF;

  -- Step 7: Send completion notifications
  -- Winner notification
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    p_winner_id,
    '🏆 You are the Arena Champion!',
    'A$' || v_net_prize || ' Arena Coins added to your wallet',
    'tournament',
    '/wallet'
  );

  -- All other participants notification
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT 
    user_id,
    'Tournament Ended',
    'Well played! Check the leaderboard for results.',
    'tournament',
    '/tournaments/' || p_tournament_id
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id AND user_id != p_winner_id;

  RAISE NOTICE 'Step 7: Notifications sent to all participants';

  -- Step 8: Update leaderboard stats
  -- Increment tournaments_played for all participants
  UPDATE profiles
  SET tournaments_played = COALESCE(tournaments_played, 0) + 1
  WHERE id IN (
    SELECT user_id FROM tournament_participants WHERE tournament_id = p_tournament_id
  );

  -- Increment tournaments_won for winner
  UPDATE profiles
  SET tournaments_won = COALESCE(tournaments_won, 0) + 1
  WHERE id = p_winner_id;

  -- Update win_rate for all participants
  UPDATE profiles
  SET win_rate = CASE 
    WHEN COALESCE(tournaments_played, 0) > 0 
    THEN (COALESCE(tournaments_won, 0)::numeric / COALESCE(tournaments_played, 0)::numeric) * 100
    ELSE 0
  END
  WHERE id IN (
    SELECT user_id FROM tournament_participants WHERE tournament_id = p_tournament_id
  );

  RAISE NOTICE 'Step 8: Leaderboard stats updated';

  -- Mark prizes as distributed
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;

  -- Build result payload for Realtime broadcast
  v_result := jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'winner_id', p_winner_id,
    'winner_username', v_winner.gamertag,
    'winner_avatar', v_winner.avatar_url,
    'prize_amount', v_net_prize,
    'runner_up_id', v_runner_up.id,
    'runner_up_username', v_runner_up.gamertag,
    'tournament_name', v_tournament.name,
    'total_participants', v_participant_count,
    'tournament_duration', EXTRACT(EPOCH FROM v_tournament_duration)::integer
  );

  RAISE NOTICE 'Tournament completion flow finished successfully';
  
  RETURN v_result;
END;
$_$;


--
-- Name: confirm_match_result("uuid", "text", integer, "uuid", "uuid", "uuid", "uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."confirm_match_result"("p_tournament_id" "uuid", "p_match_id" "text", "p_round" integer, "p_player1_id" "uuid", "p_player2_id" "uuid", "p_winner_id" "uuid", "p_reported_by" "uuid", "p_report_field" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing     match_results%ROWTYPE;
  v_other_report uuid;
  v_new_status   text;
BEGIN
  -- Upsert: create the row if it doesn't exist, do nothing if it does
  INSERT INTO match_results (
    tournament_id, match_id, round,
    player1_id, player2_id,
    player1_reported_winner, player2_reported_winner,
    submitted_by, status
  )
  VALUES (
    p_tournament_id, p_match_id, p_round,
    p_player1_id, p_player2_id,
    CASE WHEN p_report_field = 'player1_reported_winner' THEN p_winner_id ELSE NULL END,
    CASE WHEN p_report_field = 'player2_reported_winner' THEN p_winner_id ELSE NULL END,
    p_reported_by, 'pending'
  )
  ON CONFLICT (tournament_id, match_id) DO NOTHING;

  -- Now fetch the single guaranteed row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  -- Get what the other player reported
  v_other_report := CASE
    WHEN p_report_field = 'player1_reported_winner' THEN v_existing.player2_reported_winner
    ELSE v_existing.player1_reported_winner
  END;

  -- Determine status
  IF v_other_report IS NOT NULL THEN
    v_new_status := CASE WHEN v_other_report = p_winner_id THEN 'confirmed' ELSE 'disputed' END;
  ELSE
    v_new_status := 'pending';
  END IF;

  -- Single safe update by primary key
  UPDATE match_results
  SET
    player1_reported_winner = CASE WHEN p_report_field = 'player1_reported_winner' THEN p_winner_id ELSE player1_reported_winner END,
    player2_reported_winner = CASE WHEN p_report_field = 'player2_reported_winner' THEN p_winner_id ELSE player2_reported_winner END,
    submitted_by = p_reported_by,
    winner_id    = CASE WHEN v_new_status = 'confirmed' THEN p_winner_id ELSE winner_id END,
    status       = v_new_status,
    updated_at   = now()
  WHERE id = v_existing.id;

  RETURN json_build_object(
    'status', v_new_status,
    'message', CASE
      WHEN v_new_status = 'confirmed' THEN 'Match confirmed. Winner advancing.'
      WHEN v_new_status = 'disputed'  THEN 'Results conflict. Dispute raised.'
      ELSE 'Result submitted. Waiting for opponent.'
    END
  );
END;
$$;


--
-- Name: create_notification("uuid", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_link" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;


--
-- Name: create_refund_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."create_refund_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
  IF (NEW.type = 'refund') THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Refund Issued',
      'A refund of A$' || NEW.amount || ' has been processed: ' || NEW.description,
      'payment',
      '/wallet'
    );
  END IF;
  RETURN NEW;
END;
$_$;


--
-- Name: distribute_arena_prizes("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."distribute_arena_prizes"("p_tournament_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tournament        record;
  v_platform_fee      numeric;
  v_net_prize         numeric;
  v_total_entry_fees  numeric;
  v_winner_id         uuid;
  v_participant       record;
BEGIN

  -- Get tournament details
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Prevent double distribution
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- Set bypass
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  -- Calculate fees
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize    := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  -- Calculate total entry fees
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  -- Find winner
  v_winner_id := v_tournament.winner_id;

  -- ── Pay winner ───────────────────────────────────────────
  IF v_winner_id IS NOT NULL AND v_net_prize > 0 THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize,
      total_earnings    = COALESCE(total_earnings, 0) + v_net_prize,
      tournaments_won   = COALESCE(tournaments_won, 0) + 1
    WHERE id = v_winner_id;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 'tournament_win', v_net_prize,
      'Tournament prize for winning: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- ── Pay creator entry fees ───────────────────────────────
  IF v_total_entry_fees > 0 AND v_tournament.created_by IS NOT NULL THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_total_entry_fees,
      available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 'payout', v_total_entry_fees,
      'Entry fees collected for tournament: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- ── Platform fee ─────────────────────────────────────────
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);

  -- ── Update stats for ALL participants ────────────────────
  FOR v_participant IN
    SELECT tp.user_id
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
  LOOP
    IF v_participant.user_id = v_winner_id THEN
      UPDATE profiles
      SET
        wins                = COALESCE(wins, 0) + 1,
        tournaments_played  = COALESCE(tournaments_played, 0) + 1,
        current_streak      = COALESCE(current_streak, 0) + 1,
        win_rate            = CASE
                                WHEN (COALESCE(tournaments_played, 0) + 1) > 0
                                THEN ROUND(((COALESCE(wins, 0) + 1)::numeric / (COALESCE(tournaments_played, 0) + 1)::numeric) * 100, 2)
                                ELSE 0
                              END
      WHERE id = v_participant.user_id;
    ELSE
      UPDATE profiles
      SET
        losses             = COALESCE(losses, 0) + 1,
        tournaments_played = COALESCE(tournaments_played, 0) + 1,
        current_streak     = 0,
        win_rate           = CASE
                               WHEN (COALESCE(tournaments_played, 0) + 1) > 0
                               THEN ROUND((COALESCE(wins, 0)::numeric / (COALESCE(tournaments_played, 0) + 1)::numeric) * 100, 2)
                               ELSE 0
                             END
      WHERE id = v_participant.user_id;
    END IF;
  END LOOP;

  -- ── Mark tournament as distributed ───────────────────────
  UPDATE tournaments
  SET prizes_distributed = true
  WHERE id = p_tournament_id;

  PERFORM set_config('app.bypass_profile_protection', 'false', true);

END;
$$;


--
-- Name: distribute_challenge_prizes("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."distribute_challenge_prizes"("p_challenge_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_challenge record;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only distribute if match is completed and winner is set
  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if already distributed to avoid double payment
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'challenge_win') THEN
    RETURN;
  END IF;

  -- Add prize pool to winner
  UPDATE profiles
  SET 
    arena_currency = COALESCE(arena_currency, 0) + v_challenge.prize_pool,
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool,
    total_earnings = COALESCE(total_earnings, 0) + v_challenge.prize_pool,
    wins = COALESCE(wins, 0) + 1
  WHERE id = v_challenge.winner_id;

  -- Increment losses for the opponent
  UPDATE profiles
  SET 
    losses = COALESCE(losses, 0) + 1
  WHERE id = CASE 
    WHEN v_challenge.winner_id = v_challenge.challenger_id THEN v_challenge.opponent_id 
    ELSE v_challenge.challenger_id 
  END;

  -- Record transaction for winner
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (
    v_challenge.winner_id, 
    'challenge_win', 
    v_challenge.prize_pool, 
    'Quick Match prize for winning: ' || v_challenge.game, 
    'completed', 
    p_challenge_id
  );

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_challenge.platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$$;


--
-- Name: expire_old_challenges(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."expire_old_challenges"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Handle pending challenges (expired)
  UPDATE challenges
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();

  -- Handle accepted challenges where check-in deadline has passed
  -- Scenario A: Challenger checked in, Opponent didn't -> Challenger wins
  UPDATE challenges
  SET status = 'completed',
      winner_id = challenger_id,
      completed_at = now(),
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = true
    AND opponent_checked_in = false;

  -- Scenario B: Opponent checked in, Challenger didn't -> Opponent wins
  UPDATE challenges
  SET status = 'completed',
      winner_id = opponent_id,
      completed_at = now(),
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = false
    AND opponent_checked_in = true;

  -- Scenario C: Neither checked in -> Cancel/Refund
  UPDATE challenges
  SET status = 'cancelled',
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = false
    AND opponent_checked_in = false;
END;
$$;


--
-- Name: filter_profanity("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."filter_profanity"("p_text" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v_bad_words text[] := ARRAY['ass', 'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'nigger', 'faggot', 'whore', 'bastard'];
  v_word text;
  v_result text := p_text;
  v_replacement text;
BEGIN
  FOREACH v_word IN ARRAY v_bad_words
  LOOP
    v_replacement := repeat('*', length(v_word));
    -- Use regex for case-insensitive whole word replacement
    v_result := regexp_replace(v_result, '\b' || v_word || '\b', v_replacement, 'gi');
  END LOOP;
  RETURN v_result;
END;
$$;


--
-- Name: generate_tournament_brackets("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."generate_tournament_brackets"("p_tournament_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tournament          record;
  v_n                   integer;
  v_num_rounds          integer;
  v_bracket_size        integer;
  v_num_byes            integer;
  v_matches_in_round    integer;
  v_match_index         integer;
  v_match_id            text;
  v_round               integer;
  v_seed1               integer;
  v_seed2               integer;
  v_p1_id               uuid;
  v_p2_id               uuid;
  v_t1_id               uuid;
  v_t2_id               uuid;
  v_check_in_deadline   timestamptz;
  v_next_match_number   integer;
  v_next_match_id       text;
BEGIN
  FOR v_tournament IN
    SELECT * FROM tournaments
    WHERE
      (
        p_tournament_id IS NULL
        AND status = 'open'
        AND bracket_generated = false
        AND start_time <= now() -- Changed from now() + interval '15 minutes'
        AND current_players >= min_participants
      )
      OR
      (
        p_tournament_id IS NOT NULL
        AND id = p_tournament_id
        AND bracket_generated = false
      )
  LOOP

    -- ── 1. Count eligible entities ───────────────────────────────────────
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n
      FROM tournament_teams
      WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n
      FROM tournament_participants
      WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    IF v_n < 2 THEN CONTINUE; END IF;

    -- ── 2. Bracket math ──────────────────────────────────────────────────
    v_num_rounds   := ceil(log(2, v_n::numeric))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes     := v_bracket_size - v_n;
    
    -- The ready check deadline is now() + 5 minutes. 
    -- Since we only generate the bracket at start_time, this will be start_time + 5 mins.
    v_check_in_deadline := now() + interval '5 minutes';

    -- ── 3. Mark tournament active ────────────────────────────────────────
    UPDATE tournaments
    SET bracket_generated     = true,
        bracket_generated_at  = now(),
        status                = 'active',
        num_rounds            = v_num_rounds
    WHERE id = v_tournament.id;

    -- ── 4. Assign bracket seeds ──────────────────────────────────────────
    IF v_tournament.mode != 'team' THEN
      UPDATE tournament_participants SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_participants
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tp.id = seeded.id;

    ELSE
      UPDATE tournament_teams SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_teams
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tt.id = seeded.id;
    END IF;

    -- ── 5. Wipe any previous match data ──────────────────────────────────
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 1: Insert ALL placeholder rows for every round upfront.
    -- ════════════════════════════════════════════════════════════════════
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;

      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          status,
          match_duration_minutes,
          both_players_ready,
          player1_checked_in,
          player2_checked_in
        ) VALUES (
          v_tournament.id,
          'r' || v_round || '-m' || v_match_index,
          v_round,
          'pending',
          COALESCE(v_tournament.match_time_limit, 30),
          false,
          false,
          false
        );
      END LOOP;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 2: Populate round 1 matches with real player assignments.
    -- ════════════════════════════════════════════════════════════════════
    v_matches_in_round := power(2, v_num_rounds - 1)::integer;

    FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
      v_match_id := 'r1-m' || v_match_index;
      v_p1_id := NULL; v_p2_id := NULL;
      v_t1_id := NULL; v_t2_id := NULL;

      IF v_match_index < v_num_byes THEN
        -- BYE MATCH
        v_seed1 := v_match_index + 1;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        END IF;

        UPDATE match_results
        SET player1_id     = v_p1_id,
            team1_id       = v_t1_id,
            winner_id      = v_p1_id,
            status         = 'confirmed',
            admin_override = true
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;

        v_next_match_number := v_match_index / 2;
        v_next_match_id     := 'r2-m' || v_next_match_number;

        IF v_match_index % 2 = 0 THEN
          UPDATE match_results
          SET player1_id         = v_p1_id,
              team1_id           = v_t1_id,
              player1_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        ELSE
          UPDATE match_results
          SET player2_id         = v_p1_id,
              team2_id           = v_t1_id,
              player2_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        END IF;

      ELSE
        -- REAL MATCH
        v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
        v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;

          SELECT captain_id, id INTO v_p2_id, v_t2_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;

          SELECT user_id INTO v_p2_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        END IF;

        UPDATE match_results
        SET player1_id         = v_p1_id,
            player2_id         = v_p2_id,
            team1_id           = v_t1_id,
            team2_id           = v_t2_id,
            check_in_deadline  = v_check_in_deadline,
            player1_checked_in = false,
            player2_checked_in = false
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;
      END IF;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 3: Set deadlines for round 2 matches fully populated by byes
    -- ════════════════════════════════════════════════════════════════════
    UPDATE match_results
    SET check_in_deadline  = v_check_in_deadline,
        player1_checked_in = COALESCE(player1_checked_in, false),
        player2_checked_in = COALESCE(player2_checked_in, false)
    WHERE tournament_id    = v_tournament.id
      AND round            = 2
      AND player1_id       IS NOT NULL
      AND player2_id       IS NOT NULL
      AND check_in_deadline IS NULL
      AND status           = 'pending';

  END LOOP;
END;
$$;


--
-- Name: get_auth_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_auth_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


--
-- Name: get_due_reminders("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_due_reminders"("p_user_id" "uuid") RETURNS TABLE("reminder_id" "uuid", "tournament_id" "uuid", "tournament_name" "text", "start_time" timestamp with time zone, "reminder_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id as reminder_id,
    t.id as tournament_id,
    t.name as tournament_name,
    t.start_time,
    CASE
      WHEN tr.reminder_24h AND NOT tr.sent_24h AND t.start_time <= NOW() + INTERVAL '24 hours' AND t.start_time > NOW() THEN '24h'
      WHEN tr.reminder_1h AND NOT tr.sent_1h AND t.start_time <= NOW() + INTERVAL '1 hour' AND t.start_time > NOW() THEN '1h'
      WHEN tr.reminder_15m AND NOT tr.sent_15m AND t.start_time <= NOW() + INTERVAL '15 minutes' AND t.start_time > NOW() THEN '15m'
      ELSE NULL
    END as reminder_type
  FROM tournament_reminders tr
  JOIN tournaments t ON tr.tournament_id = t.id
  WHERE tr.user_id = p_user_id
  AND t.status IN ('open', 'live', 'active')
  AND (
    (tr.reminder_24h AND NOT tr.sent_24h AND t.start_time <= NOW() + INTERVAL '24 hours' AND t.start_time > NOW())
    OR (tr.reminder_1h AND NOT tr.sent_1h AND t.start_time <= NOW() + INTERVAL '1 hour' AND t.start_time > NOW())
    OR (tr.reminder_15m AND NOT tr.sent_15m AND t.start_time <= NOW() + INTERVAL '15 minutes' AND t.start_time > NOW())
  );
END;
$$;


--
-- Name: get_random_breath_taking_avatar(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_random_breath_taking_avatar"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    avatars text[] := ARRAY[
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_26dad928-74a6-44f7-b8d4-e1cf0059b2e6.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a2d80bca-adac-4a3a-9e0e-a9694bf32ba5.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f1daa62c-38d1-48bf-a619-04f491ce2bf3.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_82912364-b864-4846-89b7-ecdc85dc1225.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b5cfbf67-3067-46c6-b2cc-5c4fbea7d600.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d1e487b5-bd84-4413-a5c3-598538f08712.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a171edef-e734-4b43-b7cd-b0bb5f46c3fb.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d258695d-e03f-48ee-bffe-769d2f2a08fc.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_27659b40-fd1e-4d05-915b-513498f65e6c.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_38f6059d-b78e-4cc6-9505-7e868e703866.jpg'
    ];
BEGIN
    RETURN avatars[floor(random() * array_length(avatars, 1) + 1)];
END;
$$;


--
-- Name: get_tournament_status("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_tournament_status"("tournament_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_status text;
  v_start_time timestamptz;
BEGIN
  SELECT status, start_time INTO v_status, v_start_time
  FROM tournaments
  WHERE id = tournament_id;
  
  -- If tournament is live/active and 3+ hours have passed, return 'completed'
  IF v_status IN ('live', 'active') AND v_start_time < NOW() - INTERVAL '3 hours' THEN
    -- Update the status in database
    UPDATE tournaments SET status = 'completed' WHERE id = tournament_id;
    RETURN 'completed';
  END IF;
  
  RETURN v_status;
END;
$$;


--
-- Name: get_unread_notification_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_unread_notification_count"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = auth.uid() 
  AND read = false;
  
  RETURN v_count;
END;
$$;


--
-- Name: get_user_role("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_user_role"("uid" "uuid") RETURNS "public"."user_role"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;


--
-- Name: handle_accepted_friend_request(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_accepted_friend_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Insert friendship in both directions for easy querying
        INSERT INTO friendships (user_id, friend_id) VALUES (NEW.sender_id, NEW.receiver_id) ON CONFLICT DO NOTHING;
        INSERT INTO friendships (user_id, friend_id) VALUES (NEW.receiver_id, NEW.sender_id) ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: handle_both_players_ready(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_both_players_ready"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only act when transitioning from not-ready to both-ready
  IF COALESCE(NEW.player1_checked_in, false)
     AND COALESCE(NEW.player2_checked_in, false)
     AND NOT COALESCE(OLD.both_players_ready, false) THEN
    NEW.both_players_ready := true;
    NEW.match_started_at   := now();
    -- Grace period: match must be reported within match_duration_minutes
    NEW.match_deadline     := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_challenge_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_challenge_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only run if status is accepted or disputed
  IF NEW.status IN ('accepted', 'disputed') THEN
    
    -- Check if both players have reported and they agree
    IF NEW.challenger_reported_winner IS NOT NULL 
       AND NEW.opponent_reported_winner IS NOT NULL 
       AND NEW.challenger_reported_winner = NEW.opponent_reported_winner
    THEN
      -- Agreement reached
      NEW.status := 'completed';
      NEW.winner_id := NEW.challenger_reported_winner;
      NEW.completed_at := now();
      
      -- We'll use an AFTER trigger for prize distribution to avoid nested transaction issues if any
    
    -- Check if both have reported but they disagree
    ELSIF NEW.challenger_reported_winner IS NOT NULL 
          AND NEW.opponent_reported_winner IS NOT NULL 
          AND NEW.challenger_reported_winner != NEW.opponent_reported_winner
    THEN
      -- Conflict -> Dispute
      NEW.status := 'disputed';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_challenge_refund(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_challenge_refund"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- If challenge status changes to a terminal/non-playable status that requires a refund
  IF (OLD.status != NEW.status) AND (NEW.status IN ('declined', 'expired', 'cancelled')) THEN
    
    -- Rating penalty for cancelled matches that had a dispute
    IF NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN
      UPDATE profiles
      SET rating = GREATEST(rating - 0.5, 0.0)
      WHERE id IN (NEW.challenger_id, NEW.opponent_id);
    END IF;

    -- Refund challenger if they paid stake (Challenger pays when creating, i.e., in 'pending' status)
    IF OLD.stake_amount > 0 AND OLD.status IN ('pending', 'accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.challenger_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.challenger_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
          WHEN NEW.status = 'expired' THEN 'Challenge expired without response'
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;

    -- Refund opponent if they paid stake (Opponent pays when they accept, so status must have been 'accepted' or more)
    IF OLD.stake_amount > 0 AND OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.opponent_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.opponent_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_challenge_result_v2(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_challenge_result_v2"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
  v_system_msg text;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Only handle matches that are in relevant statuses
  IF NEW.status NOT IN ('accepted', 'disputed', 'disputed_warning') THEN
    RETURN NEW;
  END IF;

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1, capped at 10.0
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- If it's the first time they disagree, set warning status and notify
      IF NEW.status != 'disputed_warning' AND v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        
        -- Insert system message into match_messages
        v_system_msg := '⚠️ Both of you are claiming to be winners. Discuss again on the real winner. If you don''t come to an agreement, you can cancel the match but it will reduce your rating scores by 0.5. You can change your report until the timer ends.';
        
        INSERT INTO match_messages (challenge_id, user_id, message, is_system_message)
        VALUES (NEW.id, NULL, v_system_msg, true);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_match_check_in_timeout("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_match_check_in_timeout"("p_match_result_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_match  match_results%ROWTYPE;
  v_winner uuid;
  v_loser  uuid;
BEGIN
  -- Lock the row so concurrent cron calls don't double-process
  SELECT * INTO v_match
  FROM match_results
  WHERE id = p_match_result_id
  FOR UPDATE SKIP LOCKED;

  -- Row locked by another call or not found — skip
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Guards ─────────────────────────────────────────────────────────────
  -- Already resolved
  IF v_match.status = 'confirmed' THEN RETURN; END IF;

  -- Both already checked in — the ready trigger should have handled this
  IF COALESCE(v_match.player1_checked_in, false)
     AND COALESCE(v_match.player2_checked_in, false) THEN
    RETURN;
  END IF;

  -- Deadline hasn't arrived yet (safe to call early)
  IF v_match.check_in_deadline IS NULL
     OR v_match.check_in_deadline > now() THEN
    RETURN;
  END IF;

  -- ── Determine winner by check-in state ────────────────────────────────
  IF COALESCE(v_match.player1_checked_in, false)
     AND NOT COALESCE(v_match.player2_checked_in, false) THEN
    -- Player 1 showed up; Player 2 no-showed
    v_winner := v_match.player1_id;
    v_loser  := v_match.player2_id;
  ELSIF NOT COALESCE(v_match.player1_checked_in, false)
        AND COALESCE(v_match.player2_checked_in, false) THEN
    -- Player 2 showed up; Player 1 no-showed
    v_winner := v_match.player2_id;
    v_loser  := v_match.player1_id;
  ELSE
    -- Neither showed up — both eliminated, no winner propagates
    v_winner := NULL;
    v_loser  := NULL;
  END IF;

  -- ── Confirm the match ─────────────────────────────────────────────────
  -- Setting status = 'confirmed' fires the advance_winner trigger (00107)
  -- which places the winner into the next round automatically.
  UPDATE match_results
  SET status        = 'confirmed',
      winner_id     = v_winner,
      admin_override = true,
      updated_at    = now()
  WHERE id = p_match_result_id;

  -- ── Eliminate losers from tournament_participants ─────────────────────
  IF v_winner IS NOT NULL THEN
    -- Single no-show: eliminate the loser
    UPDATE tournament_participants
    SET eliminated = true
    WHERE tournament_id = v_match.tournament_id
      AND user_id = v_loser;
  ELSE
    -- Double no-show: eliminate both
    UPDATE tournament_participants
    SET eliminated = true
    WHERE tournament_id = v_match.tournament_id
      AND user_id IN (v_match.player1_id, v_match.player2_id);
  END IF;
END;
$$;


--
-- Name: handle_new_profile_avatar(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_profile_avatar"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.avatar_url IS NULL OR NEW.avatar_url = '' THEN
        NEW.avatar_url := public.get_random_breath_taking_avatar();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_gamertag text;
  v_username text;
  v_base_gamertag text;
  v_counter int := 1;
BEGIN
  -- Determine gamertag, fallback to email prefix if not provided
  v_base_gamertag := COALESCE(
    NEW.raw_user_meta_data->>'gamertag', 
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure gamertag is not empty
  IF v_base_gamertag IS NULL OR v_base_gamertag = '' THEN
    v_base_gamertag := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;

  v_gamertag := v_base_gamertag;

  -- Handle gamertag uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE gamertag = v_gamertag) LOOP
    v_gamertag := v_base_gamertag || v_counter::text;
    v_counter := v_counter + 1;
    IF v_counter > 100 THEN
      v_gamertag := v_base_gamertag || substr(NEW.id::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;

  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  IF v_username IS NULL OR v_username = '' THEN
    v_username := v_gamertag;
  END IF;

  INSERT INTO public.profiles (
    id, 
    email, 
    phone, 
    role, 
    username, 
    full_name, 
    gamertag, 
    favorite_games, 
    location, 
    timezone,
    twitch_handle,
    efootball_id,
    pubg_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    'user'::public.user_role,
    v_username,
    NEW.raw_user_meta_data->>'full_name',
    v_gamertag,
    CASE 
      WHEN NEW.raw_user_meta_data->'favorite_games' IS NOT NULL AND jsonb_typeof(NEW.raw_user_meta_data->'favorite_games') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'favorite_games'))::public.game_type[]
      ELSE '{}'::public.game_type[]
    END,
    NEW.raw_user_meta_data->>'location',
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
    NEW.raw_user_meta_data->>'twitch_handle',
    NEW.raw_user_meta_data->>'efootball_id',
    NEW.raw_user_meta_data->>'pubg_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    twitch_handle = EXCLUDED.twitch_handle,
    efootball_id = EXCLUDED.efootball_id,
    pubg_id = EXCLUDED.pubg_id;

  RETURN NEW;
END;
$$;


--
-- Name: handle_player_check_in(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_player_check_in"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- When both players check in, start the match timer
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND OLD.both_players_ready = false THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
    NEW.both_players_ready := true;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_quick_match_result(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_quick_match_result"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- First dispute: Set warning status
      IF v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        -- Clear reports to allow resubmission
        NEW.challenger_reported_winner := NULL;
        NEW.opponent_reported_winner := NULL;
        
      -- Second dispute: Cancel match and reduce ratings
      ELSE
        NEW.status := 'cancelled';
        NEW.completed_at := now();
        NEW.dispute_count := 2;
        
        -- Reduce both players' ratings by 0.5
        UPDATE profiles
        SET rating = GREATEST(rating - 0.5, 0.0)
        WHERE id IN (NEW.challenger_id, NEW.opponent_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_tournament_creation_fee(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_tournament_creation_fee"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_balance decimal;
BEGIN
  IF NEW.prize_pool > 0 THEN
    -- Check balance
    SELECT arena_currency INTO v_balance FROM profiles WHERE id = NEW.created_by;
    IF v_balance < NEW.prize_pool THEN
      RAISE EXCEPTION 'Insufficient Arena Currency to create tournament';
    END IF;

    -- Set bypass for profile protection
    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    -- Deduct balance
    UPDATE profiles 
    SET arena_currency = arena_currency - NEW.prize_pool,
        available_balance = available_balance - NEW.prize_pool
    WHERE id = NEW.created_by;
    
    PERFORM set_config('app.bypass_profile_protection', 'false', true);

    -- Record transaction (This now works because NEW.id exists in tournaments table in AFTER trigger)
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (NEW.created_by, 'tournament_fee', -NEW.prize_pool, 'Tournament creation fee: ' || NEW.name, 'completed', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_tournament_join_fee(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_tournament_join_fee"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_entry_fee decimal;
  v_balance decimal;
  v_tournament_name text;
BEGIN
  SELECT entry_fee, name INTO v_entry_fee, v_tournament_name FROM tournaments WHERE id = NEW.tournament_id;
  IF v_entry_fee > 0 THEN
    SELECT arena_currency INTO v_balance FROM profiles WHERE id = NEW.user_id;
    IF v_balance < v_entry_fee THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Set bypass
    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    UPDATE profiles 
    SET arena_currency = arena_currency - v_entry_fee,
        available_balance = available_balance - v_entry_fee
    WHERE id = NEW.user_id;

    PERFORM set_config('app.bypass_profile_protection', 'false', true);

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (NEW.user_id, 'tournament_fee', -v_entry_fee, 'Entry fee: ' || v_tournament_name, 'completed', NEW.tournament_id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_tournament_leave_refund(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_tournament_leave_refund"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_entry_fee decimal;
  v_tournament_name text;
BEGIN
  -- Get entry fee and name
  SELECT entry_fee, name INTO v_entry_fee, v_tournament_name FROM tournaments WHERE id = OLD.tournament_id;
  
  -- Only if there was an entry fee
  IF v_entry_fee > 0 THEN
    -- Set bypass
    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    -- Refund to profile
    UPDATE profiles 
    SET arena_currency = arena_currency + v_entry_fee,
        available_balance = available_balance + v_entry_fee
    WHERE id = OLD.user_id;

    PERFORM set_config('app.bypass_profile_protection', 'false', true);

    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (OLD.user_id, 'tournament_refund', v_entry_fee, 'Refund for leaving tournament: ' || v_tournament_name, 'completed', OLD.tournament_id);
  END IF;
  RETURN OLD;
END;
$$;


--
-- Name: handle_tournament_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_tournament_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM distribute_arena_prizes(NEW.id);
  END IF;

  -- Also handle cancellation
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM refund_tournament_entry_fees(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: has_role("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."has_role"("uid" "uuid", "role_name" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid AND p.role = role_name::user_role
  );
$$;


--
-- Name: increment_arena_currency("uuid", numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_arena_currency"("p_user_id" "uuid", "p_amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.profiles
    SET arena_currency = COALESCE(arena_currency, 0) + p_amount
    WHERE id = p_user_id;
END;
$$;


--
-- Name: initialize_tournament_bracket(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."initialize_tournament_bracket"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'open' AND NEW.bracket_generated = false THEN
    PERFORM generate_tournament_brackets(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: is_referee("uuid", "public"."game_type"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_referee"("uid" "uuid", "p_game" "public"."game_type") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM referee_assignments
    WHERE user_id = uid AND game = p_game
  ) OR EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = uid AND role = 'admin'
  );
$$;


--
-- Name: mark_all_notifications_read(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."mark_all_notifications_read"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications 
  SET read = true, updated_at = NOW()
  WHERE user_id = auth.uid() 
  AND read = false;
END;
$$;


--
-- Name: mark_notification_read("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications 
  SET read = true, updated_at = NOW()
  WHERE id = p_notification_id 
  AND user_id = auth.uid();
END;
$$;


--
-- Name: mark_reminder_sent("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."mark_reminder_sent"("p_reminder_id" "uuid", "p_reminder_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF p_reminder_type = '24h' THEN
    UPDATE tournament_reminders SET sent_24h = true WHERE id = p_reminder_id;
  ELSIF p_reminder_type = '1h' THEN
    UPDATE tournament_reminders SET sent_1h = true WHERE id = p_reminder_id;
  ELSIF p_reminder_type = '15m' THEN
    UPDATE tournament_reminders SET sent_15m = true WHERE id = p_reminder_id;
  END IF;
END;
$$;


--
-- Name: notify_challenge_opponent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."notify_challenge_opponent"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_challenger_gamertag text;
  v_game_name text;
BEGIN
  -- Get challenger's gamertag
  SELECT gamertag INTO v_challenger_gamertag
  FROM profiles
  WHERE id = NEW.challenger_id;
  
  -- Format game name
  v_game_name := UPPER(NEW.game);
  
  -- Insert notification for opponent
  INSERT INTO notifications (user_id, type, title, message, link, created_at)
  VALUES (
    NEW.opponent_id,
    'challenge_received',
    '⚔️ New Challenge!',
    format('%s challenged you to a %s match for $%s!', 
      v_challenger_gamertag,
      v_game_name,
      NEW.stake_amount
    ),
    '/profile',
    NOW()
  );
  
  RETURN NEW;
END;
$_$;


--
-- Name: notify_tournament_live(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."notify_tournament_live"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_participant RECORD;
BEGIN
  -- Only send notifications when status changes to 'live'
  IF NEW.status = 'live' AND OLD.status != 'live' THEN
    -- Send notification to all participants
    FOR v_participant IN
      SELECT user_id
      FROM tournament_participants
      WHERE tournament_id = NEW.id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (
        v_participant.user_id,
        'tournament_live',
        '🔴 Tournament is LIVE!',
        format('"%s" has started! Join now and compete!', NEW.name),
        '/tournaments/' || NEW.id,
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: process_expired_check_ins(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."process_expired_check_ins"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_match record;
BEGIN
  FOR v_match IN
    SELECT id
    FROM match_results
    WHERE status = 'pending'
      AND check_in_deadline IS NOT NULL
      AND check_in_deadline < now()
      -- Skip matches where both players already checked in
      -- (they should transition via the both_players_ready trigger instead)
      AND NOT (
        COALESCE(player1_checked_in, false)
        AND COALESCE(player2_checked_in, false)
      )
    ORDER BY check_in_deadline ASC  -- Process oldest expired matches first
  LOOP
    -- Delegate to the canonical per-match handler (defined in 00104)
    PERFORM handle_match_check_in_timeout(v_match.id);
  END LOOP;
END;
$$;


--
-- Name: protect_profile_sensitive_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."protect_profile_sensitive_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_role user_role;
BEGIN
  -- Check for bypass setting
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow updates from the postgres/service role (internal system updates)
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- If not an authenticated session, we might be in an internal process
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the role of the user performing the update
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- If not an admin, prevent changing sensitive columns
  IF v_user_role IS DISTINCT FROM 'admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.total_earnings IS DISTINCT FROM OLD.total_earnings OR
       NEW.arena_currency IS DISTINCT FROM OLD.arena_currency OR
       NEW.available_balance IS DISTINCT FROM OLD.available_balance OR
       NEW.pending_balance IS DISTINCT FROM OLD.pending_balance OR
       NEW.wins IS DISTINCT FROM OLD.wins OR
       NEW.losses IS DISTINCT FROM OLD.losses OR
       NEW.win_rate IS DISTINCT FROM OLD.win_rate OR
       NEW.current_streak IS DISTINCT FROM OLD.current_streak OR
       NEW.longest_streak IS DISTINCT FROM OLD.longest_streak OR
       NEW.global_rank IS DISTINCT FROM OLD.global_rank OR
       NEW.tournaments_won IS DISTINCT FROM OLD.tournaments_won OR
       NEW.tournaments_played IS DISTINCT FROM OLD.tournaments_played OR
       NEW.is_suspended IS DISTINCT FROM OLD.is_suspended OR
       NEW.banned_until IS DISTINCT FROM OLD.banned_until OR
       NEW.rating IS DISTINCT FROM OLD.rating
    THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify sensitive account fields.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: refund_tournament_entry_fees("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."refund_tournament_entry_fees"("p_tournament_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_participant record;
  v_tournament record;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RETURN; END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  FOR v_participant IN 
    SELECT user_id, amount_paid FROM tournament_participants tp WHERE tp.tournament_id = p_tournament_id AND tp.amount_paid > 0
  LOOP
    UPDATE profiles 
    SET arena_currency = COALESCE(arena_currency, 0) + v_participant.amount_paid,
        available_balance = COALESCE(available_balance, 0) + v_participant.amount_paid
    WHERE id = v_participant.user_id;
    
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (v_participant.user_id, 'refund', v_participant.amount_paid, 'Refund for tournament: ' || v_tournament.name, 'completed', p_tournament_id);
  END LOOP;

  IF v_tournament.prize_pool > 0 THEN
    UPDATE profiles 
    SET arena_currency = COALESCE(arena_currency, 0) + v_tournament.prize_pool,
        available_balance = COALESCE(available_balance, 0) + v_tournament.prize_pool
    WHERE id = v_tournament.created_by;
    
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (v_tournament.created_by, 'refund', v_tournament.prize_pool, 'Creator refund for tournament: ' || v_tournament.name, 'completed', p_tournament_id);
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'false', true);
END;
$$;


--
-- Name: send_tournament_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."send_tournament_reminders"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_time_until_start interval;
BEGIN
  -- Find tournaments starting in 13-17 minutes (to catch the 15-minute window)
  FOR v_tournament IN
    SELECT id, name, start_time, game_type
    FROM tournaments
    WHERE status = 'open'
      AND start_time > NOW()
      AND start_time <= NOW() + interval '17 minutes'
      AND start_time >= NOW() + interval '13 minutes'
  LOOP
    -- Calculate exact time until start
    v_time_until_start := v_tournament.start_time - NOW();
    
    -- Send notification to all participants
    FOR v_participant IN
      SELECT user_id
      FROM tournament_participants
      WHERE tournament_id = v_tournament.id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (
        v_participant.user_id,
        'tournament_reminder',
        'Tournament Starting Soon! ⏰',
        format('Your tournament "%s" starts in %s minutes. Get ready!', 
          v_tournament.name,
          ROUND(EXTRACT(EPOCH FROM v_time_until_start) / 60)
        ),
        '/tournaments/' || v_tournament.id,
        NOW()
      );
    END LOOP;
    
    RAISE NOTICE 'Sent reminders for tournament: %', v_tournament.name;
  END LOOP;
END;
$$;


--
-- Name: test_current_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."test_current_user"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN current_user;
END;
$$;


--
-- Name: tr_filter_chat_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."tr_filter_chat_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.message := filter_profanity(NEW.message);
  RETURN NEW;
END;
$$;


--
-- Name: transfer_pending_to_available("uuid", numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."transfer_pending_to_available"("p_user_id" "uuid", "p_amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE profiles
  SET 
    pending_balance = COALESCE(pending_balance, 0) - p_amount,
    available_balance = COALESCE(available_balance, 0) + p_amount
  WHERE id = p_user_id
    AND COALESCE(pending_balance, 0) >= p_amount;
END;
$$;


--
-- Name: trigger_distribute_challenge_prizes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."trigger_distribute_challenge_prizes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM distribute_challenge_prizes(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_challenges_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_challenges_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_tournament_participant_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_tournament_participant_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment current_players when a participant joins
    UPDATE tournaments
    SET current_players = current_players + 1
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement current_players when a participant leaves
    UPDATE tournaments
    SET current_players = GREATEST(0, current_players - 1)
    WHERE id = OLD.tournament_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_transactions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_transactions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_user_balance("uuid", numeric, "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_user_balance"("p_user_id" "uuid", "p_amount" numeric, "p_balance_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF p_balance_type = 'available' THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'pending' THEN
    UPDATE profiles
    SET pending_balance = COALESCE(pending_balance, 0) + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'arena_currency' THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + p_amount
    WHERE id = p_user_id;
  END IF;
END;
$$;


--
-- Name: apply_rls("jsonb", integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer DEFAULT (1024 * 1024)) RETURNS SETOF "realtime"."wal_rls"
    LANGUAGE "plpgsql"
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes("text", "text", "text", "text", "text", "record", "record", "text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."broadcast_changes"("topic_name" "text", "event_name" "text", "operation" "text", "table_name" "text", "table_schema" "text", "new" "record", "old" "record", "level" "text" DEFAULT 'ROW'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql("text", "regclass", "realtime"."wal_column"[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) RETURNS "text"
    LANGUAGE "sql"
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast("text", "regtype"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op("realtime"."equality_op", "regtype", "text", "text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters("realtime"."wal_column"[], "realtime"."user_defined_filter"[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes("name", "name", integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."list_changes"("publication" "name", "slot_name" "name", "max_changes" integer, "max_record_bytes" integer) RETURNS TABLE("wal" "jsonb", "is_rls_enabled" boolean, "subscription_ids" "uuid"[], "errors" "text"[], "slot_changes_count" bigint)
    LANGUAGE "sql"
    SET "log_min_messages" TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL AND ppt.tablename NOT LIKE '% %'),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  -- Count raw slot entries before apply_rls/subscription filter
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  -- Apply RLS and filter as before
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  -- Real rows with slot count attached
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  -- Sentinel row: always returned when no real rows exist so Elixir can
  -- always read slot_changes_count. Identified by wal IS NULL.
  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json("regclass"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."quote_wal2json"("entity" "regclass") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send("jsonb", "text", "text", boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."send"("payload" "jsonb", "event" "text", "topic" "text", "private" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."subscription_check_filters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole("text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."to_regrole"("role_name" "text") RETURNS "regrole"
    LANGUAGE "sql" IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."topic"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: allow_any_operation("text"[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."allow_only_operation"("expected_operation" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object("text", "text", "uuid", "jsonb"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix("text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter("text", "text", "text", integer, "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter("text", "text", "text", integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."protect_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp("text", "text", integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2("text", "text", integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE "audit_log_entries"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."custom_oauth_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_type" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret" "text" NOT NULL,
    "acceptable_client_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "pkce_enabled" boolean DEFAULT true NOT NULL,
    "attribute_mapping" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "authorization_params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "email_optional" boolean DEFAULT false NOT NULL,
    "issuer" "text",
    "discovery_url" "text",
    "skip_nonce_check" boolean DEFAULT false NOT NULL,
    "cached_discovery" "jsonb",
    "discovery_cached_at" timestamp with time zone,
    "authorization_url" "text",
    "token_url" "text",
    "userinfo_url" "text",
    "jwks_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK ((("authorization_url" IS NULL) OR ("authorization_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK ((("authorization_url" IS NULL) OR ("char_length"("authorization_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_client_id_length" CHECK ((("char_length"("client_id") >= 1) AND ("char_length"("client_id") <= 512))),
    CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK ((("discovery_url" IS NULL) OR ("char_length"("discovery_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_identifier_format" CHECK (("identifier" ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::"text")),
    CONSTRAINT "custom_oauth_providers_issuer_length" CHECK ((("issuer" IS NULL) OR (("char_length"("issuer") >= 1) AND ("char_length"("issuer") <= 2048)))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK ((("jwks_uri" IS NULL) OR ("jwks_uri" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK ((("jwks_uri" IS NULL) OR ("char_length"("jwks_uri") <= 2048))),
    CONSTRAINT "custom_oauth_providers_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))),
    CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK ((("provider_type" <> 'oauth2'::"text") OR (("authorization_url" IS NOT NULL) AND ("token_url" IS NOT NULL) AND ("userinfo_url" IS NOT NULL)))),
    CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("discovery_url" IS NULL) OR ("discovery_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NULL) OR ("issuer" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NOT NULL))),
    CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['oauth2'::"text", 'oidc'::"text"]))),
    CONSTRAINT "custom_oauth_providers_token_url_https" CHECK ((("token_url" IS NULL) OR ("token_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_token_url_length" CHECK ((("token_url" IS NULL) OR ("char_length"("token_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK ((("userinfo_url" IS NULL) OR ("userinfo_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK ((("userinfo_url" IS NULL) OR ("char_length"("userinfo_url") <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "code_challenge" "text",
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone,
    "invite_token" "text",
    "referrer" "text",
    "oauth_client_state_id" "uuid",
    "linking_target_id" "uuid",
    "email_optional" boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE "flow_state"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."flow_state" IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: TABLE "identities"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN "identities"."email"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


--
-- Name: TABLE "instances"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


--
-- Name: TABLE "mfa_amr_claims"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


--
-- Name: TABLE "mfa_challenges"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


--
-- Name: TABLE "mfa_factors"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';


--
-- Name: COLUMN "mfa_factors"."last_webauthn_challenge_data"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" "text",
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_client_states" (
    "id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "code_verifier" "text",
    "created_at" timestamp with time zone NOT NULL
);


--
-- Name: TABLE "oauth_client_states"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."oauth_client_states" IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    "token_endpoint_auth_method" "text" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048)),
    CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK (("token_endpoint_auth_method" = ANY (ARRAY['client_secret_basic'::"text", 'client_secret_post'::"text", 'none'::"text"])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


--
-- Name: TABLE "refresh_tokens"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


--
-- Name: TABLE "saml_providers"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


--
-- Name: TABLE "saml_relay_states"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


--
-- Name: TABLE "schema_migrations"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint,
    "scopes" "text",
    CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096))
);


--
-- Name: TABLE "sessions"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN "sessions"."not_after"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN "sessions"."refresh_token_hmac_key"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN "sessions"."refresh_token_counter"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


--
-- Name: TABLE "sso_domains"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


--
-- Name: TABLE "sso_providers"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN "sso_providers"."resource_id"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


--
-- Name: TABLE "users"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN "users"."is_sso_user"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."webauthn_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "challenge_type" "text" NOT NULL,
    "session_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    CONSTRAINT "webauthn_challenges_challenge_type_check" CHECK (("challenge_type" = ANY (ARRAY['signup'::"text", 'registration'::"text", 'authentication'::"text"])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."webauthn_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credential_id" "bytea" NOT NULL,
    "public_key" "bytea" NOT NULL,
    "attestation_type" "text" DEFAULT ''::"text" NOT NULL,
    "aaguid" "uuid",
    "sign_count" bigint DEFAULT 0 NOT NULL,
    "transports" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "backup_eligible" boolean DEFAULT false NOT NULL,
    "backed_up" boolean DEFAULT false NOT NULL,
    "friendly_name" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone
);


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenger_id" "uuid" NOT NULL,
    "opponent_id" "uuid" NOT NULL,
    "game" "text" NOT NULL,
    "stake_amount" numeric(10,2) NOT NULL,
    "prize_pool" numeric(10,2) NOT NULL,
    "platform_fee" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "winner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "challenger_team_id" "uuid",
    "opponent_team_id" "uuid",
    "challenger_checked_in" boolean DEFAULT false,
    "opponent_checked_in" boolean DEFAULT false,
    "check_in_deadline" timestamp with time zone,
    "both_players_ready" boolean DEFAULT false,
    "challenger_reported_winner" "uuid",
    "opponent_reported_winner" "uuid",
    "screenshot_url" "text",
    "match_started_at" timestamp with time zone,
    "match_deadline" timestamp with time zone,
    "winner_team_id" "uuid",
    "submitted_by" "uuid",
    "dispute_count" integer DEFAULT 0 NOT NULL,
    "dispute_warning_shown" boolean DEFAULT false,
    CONSTRAINT "challenges_game_check" CHECK (("game" = ANY (ARRAY['codm'::"text", 'pubg'::"text", 'fortnite'::"text", 'valorant'::"text", 'apex'::"text", 'warzone'::"text", 'fifa'::"text", 'injustice'::"text", 'mortal_kombat'::"text"]))),
    CONSTRAINT "challenges_stake_amount_check" CHECK (("stake_amount" > (0)::numeric)),
    CONSTRAINT "challenges_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text", 'completed'::"text", 'cancelled'::"text", 'disputed'::"text", 'disputed_warning'::"text"]))),
    CONSTRAINT "different_players" CHECK (("challenger_id" <> "opponent_id"))
);


--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."direct_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    "image_url" "text"
);

ALTER TABLE ONLY "public"."direct_messages" REPLICA IDENTITY FULL;


--
-- Name: dispute_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."dispute_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dispute_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "dispute_type" "public"."dispute_type" NOT NULL,
    "description" "text" NOT NULL,
    "evidence_urls" "text"[],
    "status" "public"."dispute_status" DEFAULT 'open'::"public"."dispute_status",
    "resolved_by" "uuid",
    "resolution" "text",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tournament_id" "uuid",
    "reported_user_id" "uuid",
    "category" "text",
    "admin_notes" "text"
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."exchange_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_currency" "text" NOT NULL,
    "target_currency" "text" NOT NULL,
    "rate" numeric(20,8) NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."friend_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "friend_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);

ALTER TABLE ONLY "public"."friend_requests" REPLICA IDENTITY FULL;


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."friendships" REPLICA IDENTITY FULL;


--
-- Name: game_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."game_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "game" "public"."game_type" NOT NULL,
    "in_game_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: gamertags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."gamertags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "game" "public"."game_type" NOT NULL,
    "gamertag" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: kyc_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."kyc_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "id_front_url" "text",
    "id_back_url" "text",
    "face_video_url" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "kyc_submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


--
-- Name: match_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."match_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "text",
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "is_system_message" boolean DEFAULT false,
    "attachments" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tournament_id" "uuid",
    "challenge_id" "uuid"
);


--
-- Name: match_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."match_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "match_id" "text" NOT NULL,
    "round" integer NOT NULL,
    "player1_id" "uuid",
    "player2_id" "uuid",
    "player1_reported_winner" "uuid",
    "player2_reported_winner" "uuid",
    "screenshot_url" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "winner_id" "uuid",
    "admin_override" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "match_started_at" timestamp with time zone,
    "match_deadline" timestamp with time zone,
    "match_duration_minutes" integer DEFAULT 30,
    "time_extended_by_admin" integer DEFAULT 0,
    "player1_checked_in" boolean DEFAULT false NOT NULL,
    "player2_checked_in" boolean DEFAULT false NOT NULL,
    "check_in_deadline" timestamp with time zone,
    "both_players_ready" boolean DEFAULT false NOT NULL,
    "team1_id" "uuid",
    "team2_id" "uuid",
    "check_in_started_at" timestamp with time zone,
    "replacement_count" integer DEFAULT 0 NOT NULL,
    "player1_ready_at" timestamp with time zone,
    "player2_ready_at" timestamp with time zone,
    "submitted_by" "uuid",
    CONSTRAINT "match_results_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'disputed'::"text"])))
);

ALTER TABLE ONLY "public"."match_results" REPLICA IDENTITY FULL;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "round" integer NOT NULL,
    "match_number" integer NOT NULL,
    "player1_id" "uuid",
    "player2_id" "uuid",
    "player1_score" integer,
    "player2_score" integer,
    "player1_submitted" boolean DEFAULT false,
    "player2_submitted" boolean DEFAULT false,
    "winner_id" "uuid",
    "status" "public"."match_status" DEFAULT 'upcoming'::"public"."match_status",
    "decided_by" "text" DEFAULT 'players'::"text",
    "admin_note" "text",
    "scheduled_time" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['tournament'::"text", 'match'::"text", 'payment'::"text", 'system'::"text", 'challenge_received'::"text", 'tournament_live'::"text", 'mention'::"text", 'direct_message'::"text"])))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tournament_id" "uuid",
    "items" "jsonb" NOT NULL,
    "total_amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status" NOT NULL,
    "stripe_session_id" "text",
    "stripe_payment_intent_id" "text",
    "customer_email" "text",
    "customer_name" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_method" "text" NOT NULL,
    "status" "public"."payout_status" DEFAULT 'pending'::"public"."payout_status",
    "stripe_transfer_id" "text",
    "admin_id" "uuid",
    "admin_note" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."platform_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_demo_mode" boolean DEFAULT true,
    "maintenance_balance" numeric(12,2) DEFAULT 0.00,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "phone" "text",
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role" NOT NULL,
    "gamertag" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "favorite_games" "public"."game_type"[] DEFAULT '{}'::"public"."game_type"[],
    "total_earnings" numeric(12,2) DEFAULT 0,
    "tournaments_played" integer DEFAULT 0,
    "wins" integer DEFAULT 0,
    "losses" integer DEFAULT 0,
    "win_rate" numeric(5,2) DEFAULT 0,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "global_rank" integer,
    "tier" "text" DEFAULT 'Bronze'::"text",
    "disputes_filed" integer DEFAULT 0,
    "disputes_won" integer DEFAULT 0,
    "is_suspended" boolean DEFAULT false,
    "suspension_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "banned_until" timestamp with time zone,
    "ban_reason" "text",
    "available_balance" numeric(10,2) DEFAULT 5000,
    "pending_balance" numeric(10,2) DEFAULT 0,
    "currency" "text" DEFAULT 'USD'::"text",
    "stripe_customer_id" "text",
    "stripe_connect_account_id" "text",
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "arena_currency" numeric(12,2) DEFAULT 5000,
    "feedback_submitted" boolean DEFAULT false,
    "username" "text",
    "full_name" "text",
    "location" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "tournaments_won" integer DEFAULT 0,
    "rating" numeric(4,2) DEFAULT 5.0 NOT NULL,
    "twitch_handle" "text",
    "efootball_id" "text",
    "pubg_id" "text",
    "kyc_status" "text" DEFAULT 'not_verified'::"text",
    CONSTRAINT "arena_currency_not_negative" CHECK (("arena_currency" >= (0)::numeric)),
    CONSTRAINT "gamertag_not_empty" CHECK (("length"(TRIM(BOTH FROM "gamertag")) > 0)),
    CONSTRAINT "kyc_status_check" CHECK (("kyc_status" = ANY (ARRAY['not_verified'::"text", 'pending'::"text", 'verified'::"text", 'rejected'::"text"])))
);


--
-- Name: public_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."public_profiles" AS
 SELECT "id",
    "role",
    "username",
    "gamertag",
    "avatar_url",
    "bio",
    "win_rate",
    "global_rank",
    "tier"
   FROM "public"."profiles";


--
-- Name: referee_application_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."referee_application_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: referee_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."referee_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "referee_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


--
-- Name: referee_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."referee_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "game" "public"."game_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_user_id" "uuid" NOT NULL,
    "content_id" "text",
    "content_type" "text",
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "captain_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: tournament_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tournament_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "gamertag" "text",
    "bracket_seed" integer,
    "checked_in" boolean DEFAULT false,
    "eliminated" boolean DEFAULT false,
    "final_position" integer,
    "prize_won" numeric(12,2) DEFAULT 0,
    "paid_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "checked_in_at" timestamp with time zone,
    "is_standby" boolean DEFAULT false,
    "team_id" "uuid",
    "amount_paid" numeric DEFAULT 0,
    "spectator_assigned" boolean DEFAULT false
);


--
-- Name: tournament_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tournament_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "reminder_24h" boolean DEFAULT false,
    "reminder_1h" boolean DEFAULT false,
    "reminder_15m" boolean DEFAULT false,
    "sent_24h" boolean DEFAULT false,
    "sent_1h" boolean DEFAULT false,
    "sent_15m" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: tournament_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tournament_team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: tournament_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tournament_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "team_name" "text" NOT NULL,
    "captain_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tournaments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "game" "public"."game_type" NOT NULL,
    "description" "text",
    "rules" "text",
    "format" "public"."tournament_format" NOT NULL,
    "bracket_type" "public"."bracket_type" NOT NULL,
    "max_players" integer NOT NULL,
    "current_players" integer DEFAULT 0,
    "entry_fee" numeric(12,2) NOT NULL,
    "prize_pool" numeric(12,2) DEFAULT 0,
    "prize_distribution" "jsonb" NOT NULL,
    "platform_fee_percentage" numeric(5,2) DEFAULT 10,
    "status" "public"."tournament_status" DEFAULT 'open'::"public"."tournament_status",
    "start_time" timestamp with time zone NOT NULL,
    "check_in_window" integer DEFAULT 30,
    "match_time_limit" integer DEFAULT 60,
    "score_reporting_type" "text" DEFAULT 'screenshot_required'::"text",
    "tie_break_rules" "text",
    "banned_items" "text",
    "rounds_to_win" integer DEFAULT 1,
    "created_by" "uuid",
    "featured" boolean DEFAULT false,
    "bracket" "jsonb" DEFAULT '{"rounds": []}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "default_match_duration_minutes" integer DEFAULT 30,
    "mode" "text",
    "team_size" integer DEFAULT 1,
    "creator_contribution" numeric DEFAULT 0,
    "min_participants" integer DEFAULT 5,
    "bracket_generated" boolean DEFAULT false,
    "bracket_generated_at" timestamp with time zone,
    "prizes_distributed" boolean DEFAULT false,
    "winner_id" "uuid",
    "ended_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "num_rounds" integer,
    "completed_at" timestamp with time zone
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "description" "text" NOT NULL,
    "tournament_id" "uuid",
    "match_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "currency" "text" DEFAULT 'USD'::"text",
    "status" "text" DEFAULT 'completed'::"text",
    "stripe_payment_intent_id" "text",
    "stripe_payout_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "challenge_id" "uuid"
);


--
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "feedback_text" "text" NOT NULL,
    "rating" integer,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


--
-- Name: world_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."world_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
)
PARTITION BY RANGE ("inserted_at");


--
-- Name: messages_2026_05_28; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_05_28" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_05_29; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_05_29" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_05_30; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_05_30" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_05_31; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_05_31" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_06_01; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_01" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_06_02; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_02" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_06_03; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_03" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."schema_migrations" (
    "version" bigint NOT NULL,
    "inserted_at" timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."subscription" (
    "id" bigint NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "entity" "regclass" NOT NULL,
    "filters" "realtime"."user_defined_filter"[] DEFAULT '{}'::"realtime"."user_defined_filter"[] NOT NULL,
    "claims" "jsonb" NOT NULL,
    "claims_role" "regrole" GENERATED ALWAYS AS ("realtime"."to_regrole"(("claims" ->> 'role'::"text"))) STORED NOT NULL,
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "action_filter" "text" DEFAULT '*'::"text",
    CONSTRAINT "subscription_action_filter_check" CHECK (("action_filter" = ANY (ARRAY['*'::"text", 'INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE "realtime"."subscription" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "realtime"."subscription_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


--
-- Name: COLUMN "buckets"."owner"; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb"
);


--
-- Name: COLUMN "objects"."owner"; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb",
    "metadata" "jsonb"
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE "supabase_migrations"."schema_migrations" (
    "version" "text" NOT NULL,
    "statements" "text"[],
    "name" "text",
    "created_by" "text",
    "idempotency_key" "text",
    "rollback" "text"[]
);


--
-- Name: messages_2026_05_28; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_05_28" FOR VALUES FROM ('2026-05-28 00:00:00') TO ('2026-05-29 00:00:00');


--
-- Name: messages_2026_05_29; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_05_29" FOR VALUES FROM ('2026-05-29 00:00:00') TO ('2026-05-30 00:00:00');


--
-- Name: messages_2026_05_30; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_05_30" FOR VALUES FROM ('2026-05-30 00:00:00') TO ('2026-05-31 00:00:00');


--
-- Name: messages_2026_05_31; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_05_31" FOR VALUES FROM ('2026-05-31 00:00:00') TO ('2026-06-01 00:00:00');


--
-- Name: messages_2026_06_01; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_01" FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-06-02 00:00:00');


--
-- Name: messages_2026_06_02; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_02" FOR VALUES FROM ('2026-06-02 00:00:00') TO ('2026-06-03 00:00:00');


--
-- Name: messages_2026_06_03; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_03" FOR VALUES FROM ('2026-06-03 00:00:00') TO ('2026-06-04 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_identifier_key" UNIQUE ("identifier");


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY ("id");


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_client_states"
    ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id");


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id");


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id");


--
-- Name: dispute_messages dispute_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dispute_messages"
    ADD CONSTRAINT "dispute_messages_pkey" PRIMARY KEY ("id");


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_pkey" PRIMARY KEY ("id");


--
-- Name: exchange_rates exchange_rates_base_currency_target_currency_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_base_currency_target_currency_key" UNIQUE ("base_currency", "target_currency");


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id");


--
-- Name: friend_requests friend_requests_sender_id_receiver_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_sender_id_receiver_id_key" UNIQUE ("sender_id", "receiver_id");


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");


--
-- Name: friendships friendships_user_id_friend_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_friend_id_key" UNIQUE ("user_id", "friend_id");


--
-- Name: game_accounts game_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."game_accounts"
    ADD CONSTRAINT "game_accounts_pkey" PRIMARY KEY ("id");


--
-- Name: game_accounts game_accounts_user_id_game_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."game_accounts"
    ADD CONSTRAINT "game_accounts_user_id_game_key" UNIQUE ("user_id", "game");


--
-- Name: gamertags gamertags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."gamertags"
    ADD CONSTRAINT "gamertags_pkey" PRIMARY KEY ("id");


--
-- Name: gamertags gamertags_user_id_game_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."gamertags"
    ADD CONSTRAINT "gamertags_user_id_game_key" UNIQUE ("user_id", "game");


--
-- Name: kyc_submissions kyc_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kyc_submissions"
    ADD CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id");


--
-- Name: match_messages match_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_messages"
    ADD CONSTRAINT "match_messages_pkey" PRIMARY KEY ("id");


--
-- Name: match_results match_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_pkey" PRIMARY KEY ("id");


--
-- Name: match_results match_results_tournament_id_match_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_tournament_id_match_id_key" UNIQUE ("tournament_id", "match_id");


--
-- Name: match_results match_results_tournament_match_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_tournament_match_unique" UNIQUE ("tournament_id", "match_id");


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");


--
-- Name: orders orders_stripe_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_stripe_session_id_key" UNIQUE ("stripe_session_id");


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_gamertag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_gamertag_key" UNIQUE ("gamertag");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: referee_application_messages referee_application_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referee_application_messages"
    ADD CONSTRAINT "referee_application_messages_pkey" PRIMARY KEY ("id");


--
-- Name: referee_applications referee_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referee_applications"
    ADD CONSTRAINT "referee_applications_pkey" PRIMARY KEY ("id");


--
-- Name: referee_assignments referee_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referee_assignments"
    ADD CONSTRAINT "referee_assignments_pkey" PRIMARY KEY ("id");


--
-- Name: referee_assignments referee_assignments_user_id_game_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referee_assignments"
    ADD CONSTRAINT "referee_assignments_user_id_game_key" UNIQUE ("user_id", "game");


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_key" UNIQUE ("name");


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");


--
-- Name: tournament_participants tournament_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id");


--
-- Name: tournament_participants tournament_participants_tournament_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_tournament_id_user_id_key" UNIQUE ("tournament_id", "user_id");


--
-- Name: tournament_reminders tournament_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_reminders"
    ADD CONSTRAINT "tournament_reminders_pkey" PRIMARY KEY ("id");


--
-- Name: tournament_reminders tournament_reminders_user_id_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_reminders"
    ADD CONSTRAINT "tournament_reminders_user_id_tournament_id_key" UNIQUE ("user_id", "tournament_id");


--
-- Name: tournament_team_members tournament_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_team_members"
    ADD CONSTRAINT "tournament_team_members_pkey" PRIMARY KEY ("id");


--
-- Name: tournament_team_members tournament_team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_team_members"
    ADD CONSTRAINT "tournament_team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");


--
-- Name: tournament_teams tournament_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_teams"
    ADD CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("id");


--
-- Name: tournament_teams tournament_teams_tournament_id_team_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_teams"
    ADD CONSTRAINT "tournament_teams_tournament_id_team_name_key" UNIQUE ("tournament_id", "team_name");


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");


--
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");


--
-- Name: world_chat_messages world_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."world_chat_messages"
    ADD CONSTRAINT "world_chat_messages_pkey" PRIMARY KEY ("id");


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_05_28 messages_2026_05_28_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_05_28"
    ADD CONSTRAINT "messages_2026_05_28_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_05_29 messages_2026_05_29_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_05_29"
    ADD CONSTRAINT "messages_2026_05_29_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_05_30 messages_2026_05_30_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_05_30"
    ADD CONSTRAINT "messages_2026_05_30_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_05_31 messages_2026_05_31_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_05_31"
    ADD CONSTRAINT "messages_2026_05_31_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_01 messages_2026_06_01_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_01"
    ADD CONSTRAINT "messages_2026_06_01_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_02 messages_2026_06_02_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_02"
    ADD CONSTRAINT "messages_2026_06_02_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_03 messages_2026_06_03_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_03"
    ADD CONSTRAINT "messages_2026_06_03_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."subscription"
    ADD CONSTRAINT "pk_subscription" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY "supabase_migrations"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_idempotency_key_key" UNIQUE ("idempotency_key");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY "supabase_migrations"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "custom_oauth_providers_created_at_idx" ON "auth"."custom_oauth_providers" USING "btree" ("created_at");


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "custom_oauth_providers_enabled_idx" ON "auth"."custom_oauth_providers" USING "btree" ("enabled");


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "custom_oauth_providers_identifier_idx" ON "auth"."custom_oauth_providers" USING "btree" ("identifier");


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "custom_oauth_providers_provider_type_idx" ON "auth"."custom_oauth_providers" USING "btree" ("provider_type");


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");


--
-- Name: INDEX "identities_email_idx"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states" USING "btree" ("created_at");


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_users_created_at_desc" ON "auth"."users" USING "btree" ("created_at" DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_users_email" ON "auth"."users" USING "btree" ("email");


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_users_last_sign_in_at_desc" ON "auth"."users" USING "btree" ("last_sign_in_at" DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_users_name" ON "auth"."users" USING "btree" ((("raw_user_meta_data" ->> 'name'::"text"))) WHERE (("raw_user_meta_data" ->> 'name'::"text") IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);


--
-- Name: INDEX "users_email_partial_key"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "webauthn_challenges_expires_at_idx" ON "auth"."webauthn_challenges" USING "btree" ("expires_at");


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "webauthn_challenges_user_id_idx" ON "auth"."webauthn_challenges" USING "btree" ("user_id");


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "auth"."webauthn_credentials" USING "btree" ("credential_id");


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "webauthn_credentials_user_id_idx" ON "auth"."webauthn_credentials" USING "btree" ("user_id");


--
-- Name: idx_challenges_challenger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_challenges_challenger" ON "public"."challenges" USING "btree" ("challenger_id");


--
-- Name: idx_challenges_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_challenges_expires_at" ON "public"."challenges" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"text");


--
-- Name: idx_challenges_opponent_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_challenges_opponent_status" ON "public"."challenges" USING "btree" ("opponent_id", "status") WHERE ("status" = 'pending'::"text");


--
-- Name: idx_challenges_winner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_challenges_winner_id" ON "public"."challenges" USING "btree" ("winner_id") WHERE ("winner_id" IS NOT NULL);


--
-- Name: idx_dispute_messages_dispute; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_dispute_messages_dispute" ON "public"."dispute_messages" USING "btree" ("dispute_id");


--
-- Name: idx_disputes_reported_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_disputes_reported_user" ON "public"."disputes" USING "btree" ("reported_user_id");


--
-- Name: idx_disputes_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_disputes_reporter" ON "public"."disputes" USING "btree" ("reporter_id");


--
-- Name: idx_disputes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_disputes_status" ON "public"."disputes" USING "btree" ("status");


--
-- Name: idx_game_accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_game_accounts_user_id" ON "public"."game_accounts" USING "btree" ("user_id");


--
-- Name: idx_match_messages_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_messages_match" ON "public"."match_messages" USING "btree" ("match_id");


--
-- Name: idx_match_results_pending_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_results_pending_deadline" ON "public"."match_results" USING "btree" ("check_in_deadline") WHERE (("status" = 'pending'::"text") AND ("check_in_deadline" IS NOT NULL));


--
-- Name: idx_match_results_players; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_results_players" ON "public"."match_results" USING "btree" ("player1_id", "player2_id");


--
-- Name: idx_match_results_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_results_round" ON "public"."match_results" USING "btree" ("tournament_id", "round");


--
-- Name: idx_match_results_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_results_status" ON "public"."match_results" USING "btree" ("status");


--
-- Name: idx_match_results_team1_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_results_team1_id" ON "public"."match_results" USING "btree" ("team1_id");


--
-- Name: idx_match_results_team2_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_results_team2_id" ON "public"."match_results" USING "btree" ("team2_id");


--
-- Name: idx_match_results_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_results_tournament" ON "public"."match_results" USING "btree" ("tournament_id");


--
-- Name: idx_match_results_tournament_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_match_results_tournament_round" ON "public"."match_results" USING "btree" ("tournament_id", "round");


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_matches_status" ON "public"."matches" USING "btree" ("status");


--
-- Name: idx_matches_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_matches_tournament" ON "public"."matches" USING "btree" ("tournament_id");


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id") WHERE ("read" = false);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");


--
-- Name: idx_orders_stripe_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_orders_stripe_session_id" ON "public"."orders" USING "btree" ("stripe_session_id");


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");


--
-- Name: idx_payouts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_payouts_status" ON "public"."payouts" USING "btree" ("status");


--
-- Name: idx_profiles_available_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_available_balance" ON "public"."profiles" USING "btree" ("available_balance" DESC);


--
-- Name: idx_profiles_banned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_banned" ON "public"."profiles" USING "btree" ("banned_until") WHERE ("banned_until" IS NOT NULL);


--
-- Name: idx_profiles_gamertag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_gamertag" ON "public"."profiles" USING "btree" ("gamertag");


--
-- Name: idx_profiles_gamertag_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_gamertag_search" ON "public"."profiles" USING "gin" ("gamertag" "public"."gin_trgm_ops");


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");


--
-- Name: idx_profiles_stripe_connect; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_stripe_connect" ON "public"."profiles" USING "btree" ("stripe_connect_account_id") WHERE ("stripe_connect_account_id" IS NOT NULL);


--
-- Name: idx_profiles_stripe_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_stripe_customer" ON "public"."profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);


--
-- Name: idx_profiles_username_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_username_search" ON "public"."profiles" USING "gin" ("username" "public"."gin_trgm_ops");


--
-- Name: idx_tournament_participants_checked_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournament_participants_checked_in" ON "public"."tournament_participants" USING "btree" ("checked_in", "checked_in_at");


--
-- Name: idx_tournament_participants_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournament_participants_team_id" ON "public"."tournament_participants" USING "btree" ("team_id");


--
-- Name: idx_tournament_reminders_tournament_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournament_reminders_tournament_id" ON "public"."tournament_reminders" USING "btree" ("tournament_id");


--
-- Name: idx_tournament_reminders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournament_reminders_user_id" ON "public"."tournament_reminders" USING "btree" ("user_id");


--
-- Name: idx_tournament_team_members_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournament_team_members_team_id" ON "public"."tournament_team_members" USING "btree" ("team_id");


--
-- Name: idx_tournament_team_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournament_team_members_user_id" ON "public"."tournament_team_members" USING "btree" ("user_id");


--
-- Name: idx_tournament_teams_tournament_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournament_teams_tournament_id" ON "public"."tournament_teams" USING "btree" ("tournament_id");


--
-- Name: idx_tournaments_game; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournaments_game" ON "public"."tournaments" USING "btree" ("game");


--
-- Name: idx_tournaments_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournaments_start_time" ON "public"."tournaments" USING "btree" ("start_time");


--
-- Name: idx_tournaments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournaments_status" ON "public"."tournaments" USING "btree" ("status");


--
-- Name: idx_tournaments_winner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tournaments_winner" ON "public"."tournaments" USING "btree" ("winner_id");


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_transactions_created_at" ON "public"."transactions" USING "btree" ("created_at" DESC);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_transactions_status" ON "public"."transactions" USING "btree" ("status") WHERE ("status" IS NOT NULL);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_transactions_type" ON "public"."transactions" USING "btree" ("type");


--
-- Name: idx_transactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_transactions_user" ON "public"."transactions" USING "btree" ("user_id");


--
-- Name: idx_transactions_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_transactions_user_created" ON "public"."transactions" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_transactions_user_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_transactions_user_type_created" ON "public"."transactions" USING "btree" ("user_id", "type", "created_at" DESC);


--
-- Name: idx_world_chat_created_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_world_chat_created_at_desc" ON "public"."world_chat_messages" USING "btree" ("created_at" DESC);


--
-- Name: idx_world_chat_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_world_chat_messages_created_at" ON "public"."world_chat_messages" USING "btree" ("created_at" DESC);


--
-- Name: idx_world_chat_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_world_chat_messages_user_id" ON "public"."world_chat_messages" USING "btree" ("user_id");


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "ix_realtime_subscription_entity" ON "realtime"."subscription" USING "btree" ("entity");


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_inserted_at_topic_index" ON ONLY "realtime"."messages" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_05_28_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_05_28_inserted_at_topic_idx" ON "realtime"."messages_2026_05_28" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_05_29_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_05_29_inserted_at_topic_idx" ON "realtime"."messages_2026_05_29" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_05_30_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_05_30_inserted_at_topic_idx" ON "realtime"."messages_2026_05_30" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_05_31_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_05_31_inserted_at_topic_idx" ON "realtime"."messages_2026_05_31" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_01_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_01_inserted_at_topic_idx" ON "realtime"."messages_2026_06_01" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_02_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_02_inserted_at_topic_idx" ON "realtime"."messages_2026_06_02" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_03_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_03_inserted_at_topic_idx" ON "realtime"."messages_2026_06_03" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX "subscription_subscription_id_entity_filters_action_filter_key" ON "realtime"."subscription" USING "btree" ("subscription_id", "entity", "filters", "action_filter");


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_objects_bucket_id_name_lower" ON "storage"."objects" USING "btree" ("bucket_id", "lower"("name") COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");


--
-- Name: messages_2026_05_28_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_05_28_inserted_at_topic_idx";


--
-- Name: messages_2026_05_28_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_05_28_pkey";


--
-- Name: messages_2026_05_29_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_05_29_inserted_at_topic_idx";


--
-- Name: messages_2026_05_29_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_05_29_pkey";


--
-- Name: messages_2026_05_30_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_05_30_inserted_at_topic_idx";


--
-- Name: messages_2026_05_30_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_05_30_pkey";


--
-- Name: messages_2026_05_31_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_05_31_inserted_at_topic_idx";


--
-- Name: messages_2026_05_31_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_05_31_pkey";


--
-- Name: messages_2026_06_01_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_01_inserted_at_topic_idx";


--
-- Name: messages_2026_06_01_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_01_pkey";


--
-- Name: messages_2026_06_02_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_02_inserted_at_topic_idx";


--
-- Name: messages_2026_06_02_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_02_pkey";


--
-- Name: messages_2026_06_03_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_03_inserted_at_topic_idx";


--
-- Name: messages_2026_06_03_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_03_pkey";


--
-- Name: users on_auth_user_confirmed; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER "on_auth_user_confirmed" AFTER UPDATE ON "auth"."users" FOR EACH ROW WHEN ((("old"."confirmed_at" IS NULL) AND ("new"."confirmed_at" IS NOT NULL))) EXECUTE FUNCTION "public"."handle_new_user"();


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW WHEN (("new"."confirmed_at" IS NOT NULL)) EXECUTE FUNCTION "public"."handle_new_user"();


--
-- Name: match_results advance_winner_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "advance_winner_trigger" AFTER UPDATE ON "public"."match_results" FOR EACH ROW EXECUTE FUNCTION "public"."advance_winner"();


--
-- Name: match_results auto_start_match_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "auto_start_match_trigger" BEFORE INSERT OR UPDATE ON "public"."match_results" FOR EACH ROW EXECUTE FUNCTION "public"."auto_start_match"();


--
-- Name: match_results both_players_ready_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "both_players_ready_trigger" BEFORE UPDATE ON "public"."match_results" FOR EACH ROW WHEN (("new"."player1_checked_in" AND "new"."player2_checked_in")) EXECUTE FUNCTION "public"."handle_both_players_ready"();


--
-- Name: challenges challenge_refund_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "challenge_refund_trigger" AFTER UPDATE ON "public"."challenges" FOR EACH ROW EXECUTE FUNCTION "public"."handle_challenge_refund"();


--
-- Name: challenges challenges_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "challenges_updated_at" BEFORE UPDATE ON "public"."challenges" FOR EACH ROW EXECUTE FUNCTION "public"."update_challenges_updated_at"();


--
-- Name: match_results check_tournament_completion_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "check_tournament_completion_trigger" AFTER UPDATE ON "public"."match_results" FOR EACH ROW EXECUTE FUNCTION "public"."check_tournament_completion"();


--
-- Name: match_results handle_check_in_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "handle_check_in_trigger" BEFORE UPDATE ON "public"."match_results" FOR EACH ROW WHEN ((("old"."player1_checked_in" IS DISTINCT FROM "new"."player1_checked_in") OR ("old"."player2_checked_in" IS DISTINCT FROM "new"."player2_checked_in"))) EXECUTE FUNCTION "public"."handle_player_check_in"();


--
-- Name: challenges notify_on_challenge_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "notify_on_challenge_insert" AFTER INSERT ON "public"."challenges" FOR EACH ROW WHEN (("new"."status" = 'pending'::"text")) EXECUTE FUNCTION "public"."notify_challenge_opponent"();


--
-- Name: tournaments notify_on_tournament_live; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "notify_on_tournament_live" AFTER UPDATE OF "status" ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_tournament_live"();


--
-- Name: friend_requests on_friend_request_accepted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "on_friend_request_accepted" AFTER UPDATE ON "public"."friend_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_accepted_friend_request"();


--
-- Name: transactions refund_notification_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "refund_notification_trigger" AFTER INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."create_refund_notification"();


--
-- Name: world_chat_messages tr_filter_chat_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_filter_chat_message" BEFORE INSERT OR UPDATE ON "public"."world_chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."tr_filter_chat_message"();


--
-- Name: profiles tr_on_profile_avatar_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_on_profile_avatar_insert" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_profile_avatar"();


--
-- Name: profiles tr_protect_profile_sensitive_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_protect_profile_sensitive_columns" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_sensitive_columns"();


--
-- Name: tournaments tr_tournament_creation_fee; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_tournament_creation_fee" AFTER INSERT ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_tournament_creation_fee"();


--
-- Name: tournament_participants tr_tournament_join_fee; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_tournament_join_fee" AFTER INSERT ON "public"."tournament_participants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_tournament_join_fee"();


--
-- Name: tournament_participants tr_tournament_leave_refund; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_tournament_leave_refund" AFTER DELETE ON "public"."tournament_participants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_tournament_leave_refund"();


--
-- Name: transactions transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_transactions_updated_at"();


--
-- Name: match_results trg_advance_winner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_advance_winner" AFTER UPDATE ON "public"."match_results" FOR EACH ROW EXECUTE FUNCTION "public"."advance_winner"();


--
-- Name: match_results trg_both_players_ready; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_both_players_ready" BEFORE UPDATE ON "public"."match_results" FOR EACH ROW EXECUTE FUNCTION "public"."handle_both_players_ready"();


--
-- Name: match_results trg_match_results_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_match_results_updated_at" BEFORE UPDATE ON "public"."match_results" FOR EACH ROW EXECUTE FUNCTION "public"."_update_match_results_timestamp"();


--
-- Name: match_results trigger_advance_winner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_advance_winner" AFTER INSERT OR UPDATE ON "public"."match_results" FOR EACH ROW EXECUTE FUNCTION "public"."advance_winner_to_next_match"();


--
-- Name: challenges trigger_auto_start_challenge; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_auto_start_challenge" BEFORE UPDATE ON "public"."challenges" FOR EACH ROW EXECUTE FUNCTION "public"."auto_start_challenge"();


--
-- Name: challenges trigger_challenge_prize_distribution; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_challenge_prize_distribution" AFTER UPDATE ON "public"."challenges" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_distribute_challenge_prizes"();


--
-- Name: match_results trigger_check_tournament_completion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_check_tournament_completion" AFTER UPDATE OF "status" ON "public"."match_results" FOR EACH ROW EXECUTE FUNCTION "public"."check_for_tournament_completion"();


--
-- Name: challenges trigger_handle_challenge_result; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_handle_challenge_result" BEFORE UPDATE ON "public"."challenges" FOR EACH ROW WHEN ((("new"."challenger_reported_winner" IS DISTINCT FROM "old"."challenger_reported_winner") OR ("new"."opponent_reported_winner" IS DISTINCT FROM "old"."opponent_reported_winner"))) EXECUTE FUNCTION "public"."handle_challenge_result_v2"();


--
-- Name: tournaments trigger_initialize_bracket; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_initialize_bracket" AFTER UPDATE OF "status" ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."initialize_tournament_bracket"();


--
-- Name: tournaments trigger_tournament_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_tournament_status_change" AFTER UPDATE OF "status" ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_tournament_status_change"();


--
-- Name: tournament_participants update_participant_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_participant_count_trigger" AFTER INSERT OR DELETE ON "public"."tournament_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_tournament_participant_count"();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER "tr_check_filters" BEFORE INSERT OR UPDATE ON "realtime"."subscription" FOR EACH ROW EXECUTE FUNCTION "realtime"."subscription_check_filters"();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "protect_buckets_delete" BEFORE DELETE ON "storage"."buckets" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "protect_objects_delete" BEFORE DELETE ON "storage"."objects" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: challenges challenges_challenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: challenges challenges_challenger_reported_winner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_challenger_reported_winner_fkey" FOREIGN KEY ("challenger_reported_winner") REFERENCES "auth"."users"("id");


--
-- Name: challenges challenges_challenger_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_challenger_team_id_fkey" FOREIGN KEY ("challenger_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: challenges challenges_opponent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: challenges challenges_opponent_reported_winner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_opponent_reported_winner_fkey" FOREIGN KEY ("opponent_reported_winner") REFERENCES "auth"."users"("id");


--
-- Name: challenges challenges_opponent_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_opponent_team_id_fkey" FOREIGN KEY ("opponent_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: challenges challenges_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id");


--
-- Name: challenges challenges_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: challenges challenges_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;


--
-- Name: direct_messages direct_messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: dispute_messages dispute_messages_dispute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dispute_messages"
    ADD CONSTRAINT "dispute_messages_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id") ON DELETE CASCADE;


--
-- Name: dispute_messages dispute_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dispute_messages"
    ADD CONSTRAINT "dispute_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: disputes disputes_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_admin_id_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");


--
-- Name: disputes disputes_filed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_filed_by_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id");


--
-- Name: disputes disputes_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;


--
-- Name: disputes disputes_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: disputes disputes_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: friendships friendships_friend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: friendships friendships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: game_accounts game_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."game_accounts"
    ADD CONSTRAINT "game_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: gamertags gamertags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."gamertags"
    ADD CONSTRAINT "gamertags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: kyc_submissions kyc_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kyc_submissions"
    ADD CONSTRAINT "kyc_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: match_messages match_messages_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_messages"
    ADD CONSTRAINT "match_messages_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;


--
-- Name: match_messages match_messages_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_messages"
    ADD CONSTRAINT "match_messages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;


--
-- Name: match_messages match_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_messages"
    ADD CONSTRAINT "match_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: match_results match_results_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: match_results match_results_player1_reported_winner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_player1_reported_winner_fkey" FOREIGN KEY ("player1_reported_winner") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: match_results match_results_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: match_results match_results_player2_reported_winner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_player2_reported_winner_fkey" FOREIGN KEY ("player2_reported_winner") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: match_results match_results_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id");


--
-- Name: match_results match_results_team1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "public"."tournament_teams"("id") ON DELETE SET NULL;


--
-- Name: match_results match_results_team2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "public"."tournament_teams"("id") ON DELETE SET NULL;


--
-- Name: match_results match_results_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;


--
-- Name: match_results match_results_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: matches matches_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "public"."profiles"("id");


--
-- Name: matches matches_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "public"."profiles"("id");


--
-- Name: matches matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;


--
-- Name: matches matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id");


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: orders orders_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: payouts payouts_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");


--
-- Name: payouts payouts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: referee_application_messages referee_application_messages_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referee_application_messages"
    ADD CONSTRAINT "referee_application_messages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."referee_applications"("id") ON DELETE CASCADE;


--
-- Name: referee_application_messages referee_application_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referee_application_messages"
    ADD CONSTRAINT "referee_application_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: referee_applications referee_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referee_applications"
    ADD CONSTRAINT "referee_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: referee_assignments referee_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referee_assignments"
    ADD CONSTRAINT "referee_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: reports reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."profiles"("id");


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id");


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: teams teams_captain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: tournament_participants tournament_participants_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE SET NULL;


--
-- Name: tournament_participants tournament_participants_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;


--
-- Name: tournament_participants tournament_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: tournament_reminders tournament_reminders_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_reminders"
    ADD CONSTRAINT "tournament_reminders_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;


--
-- Name: tournament_reminders tournament_reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_reminders"
    ADD CONSTRAINT "tournament_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: tournament_team_members tournament_team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_team_members"
    ADD CONSTRAINT "tournament_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE CASCADE;


--
-- Name: tournament_team_members tournament_team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_team_members"
    ADD CONSTRAINT "tournament_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: tournament_teams tournament_teams_captain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_teams"
    ADD CONSTRAINT "tournament_teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: tournament_teams tournament_teams_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournament_teams"
    ADD CONSTRAINT "tournament_teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;


--
-- Name: tournaments tournaments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");


--
-- Name: tournaments tournaments_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "auth"."users"("id");


--
-- Name: transactions transactions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: transactions transactions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."match_results"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: transactions transactions_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: user_feedback user_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: world_chat_messages world_chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."world_chat_messages"
    ADD CONSTRAINT "world_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;

--
-- Name: match_results Admins can insert match results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert match results" ON "public"."match_results" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: challenges Admins can manage all challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all challenges" ON "public"."challenges" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: matches Admins can manage all matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all matches" ON "public"."matches" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: tournaments Admins can manage all tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tournaments" ON "public"."tournaments" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: referee_assignments Admins can manage assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage assignments" ON "public"."referee_assignments" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: disputes Admins can manage disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage disputes" ON "public"."disputes" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: tournament_participants Admins can manage participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage participants" ON "public"."tournament_participants" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: payouts Admins can manage payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payouts" ON "public"."payouts" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: match_results Admins can update any match results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any match results" ON "public"."match_results" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: disputes Admins can update disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update disputes" ON "public"."disputes" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: disputes Admins can view all disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all disputes" ON "public"."disputes" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: user_feedback Admins can view all feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all feedback" ON "public"."user_feedback" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: reports Admins can view all reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all reports" ON "public"."reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: transactions Admins can view all transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: referee_applications Admins can view and update all applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view and update all applications" ON "public"."referee_applications" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: game_accounts Admins have full access to game accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to game accounts" ON "public"."game_accounts" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));


--
-- Name: profiles Admins have full access to profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to profiles" ON "public"."profiles" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));


--
-- Name: world_chat_messages Anyone can read world chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read world chat messages" ON "public"."world_chat_messages" FOR SELECT TO "authenticated" USING (true);


--
-- Name: referee_assignments Anyone can view assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view assignments" ON "public"."referee_assignments" FOR SELECT TO "authenticated" USING (true);


--
-- Name: exchange_rates Anyone can view exchange rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view exchange rates" ON "public"."exchange_rates" FOR SELECT USING (true);


--
-- Name: gamertags Anyone can view gamertags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view gamertags" ON "public"."gamertags" FOR SELECT TO "authenticated" USING (true);


--
-- Name: match_results Anyone can view match results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view match results" ON "public"."match_results" FOR SELECT TO "authenticated" USING (true);


--
-- Name: matches Anyone can view matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view matches" ON "public"."matches" FOR SELECT TO "authenticated" USING (true);


--
-- Name: tournaments Anyone can view open tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view open tournaments" ON "public"."tournaments" FOR SELECT TO "authenticated" USING (true);


--
-- Name: tournament_participants Anyone can view participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view participants" ON "public"."tournament_participants" FOR SELECT TO "authenticated" USING (true);


--
-- Name: platform_settings Anyone can view platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view platform settings" ON "public"."platform_settings" FOR SELECT USING (true);


--
-- Name: profiles Anyone can view public profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);


--
-- Name: team_members Anyone can view team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view team members" ON "public"."team_members" FOR SELECT USING (true);


--
-- Name: tournament_team_members Anyone can view team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view team members" ON "public"."tournament_team_members" FOR SELECT USING (true);


--
-- Name: teams Anyone can view teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view teams" ON "public"."teams" FOR SELECT USING (true);


--
-- Name: tournament_teams Anyone can view teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view teams" ON "public"."tournament_teams" FOR SELECT USING (true);


--
-- Name: tournament_teams Authenticated users can create teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create teams" ON "public"."tournament_teams" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "captain_id"));


--
-- Name: world_chat_messages Authenticated users can send world chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can send world chat messages" ON "public"."world_chat_messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: team_members Captains can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Captains can manage members" ON "public"."team_members" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_members"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));


--
-- Name: teams Captains can manage their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Captains can manage their teams" ON "public"."teams" USING (("auth"."uid"() = "captain_id"));


--
-- Name: challenges Challengers can cancel pending challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Challengers can cancel pending challenges" ON "public"."challenges" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "challenger_id") AND ("status" = 'pending'::"text"))) WITH CHECK (("status" = 'cancelled'::"text"));


--
-- Name: tournaments Creators can update their tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can update their tournaments" ON "public"."tournaments" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));


--
-- Name: platform_settings Only admins can update platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update platform settings" ON "public"."platform_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: challenges Opponents can update challenge status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Opponents can update challenge status" ON "public"."challenges" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "opponent_id") AND ("status" = 'pending'::"text"))) WITH CHECK (("status" = ANY (ARRAY['accepted'::"text", 'declined'::"text"])));


--
-- Name: challenges Participants can update live challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants can update live challenges" ON "public"."challenges" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "opponent_id"))) WITH CHECK ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "opponent_id")));


--
-- Name: match_results Players can insert their match results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can insert their match results" ON "public"."match_results" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "player1_id") OR ("auth"."uid"() = "player2_id")));


--
-- Name: matches Players can update their match scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can update their match scores" ON "public"."matches" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "player1_id") OR ("auth"."uid"() = "player2_id")));


--
-- Name: match_results Players can update their own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can update their own reports" ON "public"."match_results" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "player1_id") OR ("auth"."uid"() = "player2_id"))) WITH CHECK ((("auth"."uid"() = "player1_id") OR ("auth"."uid"() = "player2_id")));


--
-- Name: friend_requests Receivers can update friend request status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Receivers can update friend request status" ON "public"."friend_requests" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "receiver_id")) WITH CHECK (("auth"."uid"() = "receiver_id"));


--
-- Name: match_results Referees can insert match results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referees can insert match results" ON "public"."match_results" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "match_results"."tournament_id") AND "public"."is_referee"("auth"."uid"(), "t"."game")))));


--
-- Name: match_results Referees can update match results for their assigned games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referees can update match results for their assigned games" ON "public"."match_results" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "match_results"."tournament_id") AND "public"."is_referee"("auth"."uid"(), "t"."game"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "match_results"."tournament_id") AND "public"."is_referee"("auth"."uid"(), "t"."game")))));


--
-- Name: dispute_messages Referees can view and send messages in disputes for their assig; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referees can view and send messages in disputes for their assig" ON "public"."dispute_messages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."disputes" "d"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "d"."tournament_id")))
  WHERE (("d"."id" = "dispute_messages"."dispute_id") AND "public"."is_referee"("auth"."uid"(), "t"."game")))));


--
-- Name: disputes Referees can view and update disputes for their assigned games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referees can view and update disputes for their assigned games" ON "public"."disputes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "disputes"."tournament_id") AND "public"."is_referee"("auth"."uid"(), "t"."game")))));


--
-- Name: orders Service role can manage orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage orders" ON "public"."orders" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: tournament_team_members Team captains and members can remove themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team captains and members can remove themselves" ON "public"."tournament_team_members" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_teams"
  WHERE (("tournament_teams"."id" = "tournament_team_members"."team_id") AND ("tournament_teams"."captain_id" = "auth"."uid"()))))));


--
-- Name: tournament_team_members Team captains can add members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team captains can add members" ON "public"."tournament_team_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tournament_teams"
  WHERE (("tournament_teams"."id" = "tournament_team_members"."team_id") AND ("tournament_teams"."captain_id" = "auth"."uid"())))));


--
-- Name: tournament_teams Team captains can delete their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team captains can delete their teams" ON "public"."tournament_teams" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "captain_id"));


--
-- Name: tournament_teams Team captains can update their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team captains can update their teams" ON "public"."tournament_teams" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "captain_id"));


--
-- Name: challenges Users can create challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create challenges" ON "public"."challenges" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "challenger_id") AND ("stake_amount" >= (2)::numeric) AND ("stake_amount" <= (1000)::numeric)));


--
-- Name: disputes Users can create disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create disputes" ON "public"."disputes" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = "auth"."uid"()));


--
-- Name: reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));


--
-- Name: referee_applications Users can create their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own applications" ON "public"."referee_applications" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: tournaments Users can create tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tournaments" ON "public"."tournaments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));


--
-- Name: game_accounts Users can delete own game accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own game accounts" ON "public"."game_accounts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: tournament_reminders Users can delete own reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reminders" ON "public"."tournament_reminders" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: world_chat_messages Users can delete their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own messages" ON "public"."world_chat_messages" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: disputes Users can file disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can file disputes" ON "public"."disputes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));


--
-- Name: match_messages Users can insert match messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert match messages" ON "public"."match_messages" FOR INSERT TO "authenticated" WITH CHECK ((("tournament_id" IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM "public"."challenges"
  WHERE (("challenges"."id" = "match_messages"."challenge_id") AND (("challenges"."challenger_id" = "auth"."uid"()) OR ("challenges"."opponent_id" = "auth"."uid"())))))));


--
-- Name: game_accounts Users can insert own game accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own game accounts" ON "public"."game_accounts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: tournament_reminders Users can insert own reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own reminders" ON "public"."tournament_reminders" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: kyc_submissions Users can insert their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own submissions" ON "public"."kyc_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: tournament_participants Users can join tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can join tournaments" ON "public"."tournament_participants" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: team_members Users can leave teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can leave teams" ON "public"."team_members" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: gamertags Users can manage their own gamertags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own gamertags" ON "public"."gamertags" TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: direct_messages Users can mark their received DMs as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark their received DMs as read" ON "public"."direct_messages" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "receiver_id")) WITH CHECK (("auth"."uid"() = "receiver_id"));


--
-- Name: payouts Users can request payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can request payouts" ON "public"."payouts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: direct_messages Users can send DMs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send DMs" ON "public"."direct_messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender_id"));


--
-- Name: friend_requests Users can send friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send friend requests" ON "public"."friend_requests" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender_id"));


--
-- Name: match_messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON "public"."match_messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: dispute_messages Users can send messages in their disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages in their disputes" ON "public"."dispute_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."disputes" "d"
  WHERE (("d"."id" = "dispute_messages"."dispute_id") AND (("d"."reporter_id" = "auth"."uid"()) OR ("d"."reported_user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")))))));


--
-- Name: user_feedback Users can submit their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can submit their own feedback" ON "public"."user_feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: game_accounts Users can update own game accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own game accounts" ON "public"."game_accounts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: tournament_reminders Users can update own reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reminders" ON "public"."tournament_reminders" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK ((NOT ("role" IS DISTINCT FROM "public"."get_user_role"("auth"."uid"()))));


--
-- Name: referee_application_messages Users can view and send messages for their applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view and send messages for their applications" ON "public"."referee_application_messages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."referee_applications"
  WHERE (("referee_applications"."id" = "referee_application_messages"."application_id") AND (("referee_applications"."user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text"))))));


--
-- Name: match_messages Users can view match messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view match messages" ON "public"."match_messages" FOR SELECT TO "authenticated" USING ((("tournament_id" IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM "public"."challenges"
  WHERE (("challenges"."id" = "match_messages"."challenge_id") AND (("challenges"."challenger_id" = "auth"."uid"()) OR ("challenges"."opponent_id" = "auth"."uid"())))))));


--
-- Name: dispute_messages Users can view messages in their disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their disputes" ON "public"."dispute_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."disputes" "d"
  WHERE (("d"."id" = "dispute_messages"."dispute_id") AND (("d"."reporter_id" = "auth"."uid"()) OR ("d"."reported_user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text"))))));


--
-- Name: game_accounts Users can view own game accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own game accounts" ON "public"."game_accounts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: tournament_reminders Users can view own reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own reminders" ON "public"."tournament_reminders" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: direct_messages Users can view their own DMs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own DMs" ON "public"."direct_messages" FOR SELECT TO "authenticated" USING ("public"."can_access_dm"("sender_id", "receiver_id"));


--
-- Name: referee_applications Users can view their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own applications" ON "public"."referee_applications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: challenges Users can view their own challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own challenges" ON "public"."challenges" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "opponent_id")));


--
-- Name: disputes Users can view their own disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own disputes" ON "public"."disputes" FOR SELECT TO "authenticated" USING ((("reporter_id" = "auth"."uid"()) OR ("reported_user_id" = "auth"."uid"())));


--
-- Name: friendships Users can view their own friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own friendships" ON "public"."friendships" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));


--
-- Name: payouts Users can view their own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payouts" ON "public"."payouts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));


--
-- Name: friend_requests Users can view their own sent/received friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sent/received friend requests" ON "public"."friend_requests" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "receiver_id")));


--
-- Name: kyc_submissions Users can view their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own submissions" ON "public"."kyc_submissions" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;

--
-- Name: direct_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."direct_messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: dispute_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."dispute_messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."disputes" ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;

--
-- Name: friend_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."friend_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: friendships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;

--
-- Name: game_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."game_accounts" ENABLE ROW LEVEL SECURITY;

--
-- Name: gamertags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."gamertags" ENABLE ROW LEVEL SECURITY;

--
-- Name: kyc_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."kyc_submissions" ENABLE ROW LEVEL SECURITY;

--
-- Name: match_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."match_messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: match_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."match_results" ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;

--
-- Name: payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: referee_application_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."referee_application_messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: referee_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."referee_applications" ENABLE ROW LEVEL SECURITY;

--
-- Name: referee_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."referee_assignments" ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tournament_participants" ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tournament_reminders" ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tournament_team_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tournament_teams" ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;

--
-- Name: world_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."world_chat_messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE "realtime"."messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Anyone can view avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Anyone can view avatars" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatars'::"text"));


--
-- Name: objects Anyone can view tournament screenshots; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Anyone can view tournament screenshots" ON "storage"."objects" FOR SELECT TO "authenticated" USING (("bucket_id" = 'tournament_screenshots'::"text"));


--
-- Name: objects Authenticated users can upload screenshots; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can upload screenshots" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'tournament_screenshots'::"text"));


--
-- Name: objects Match participants can view evidence; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Match participants can view evidence" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'evidence'::"text") AND ((("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1]) OR "public"."has_role"("auth"."uid"(), 'admin'::"text"))));


--
-- Name: objects Users can delete their own avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can delete their own avatars" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));


--
-- Name: objects Users can update their own avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can update their own avatars" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));


--
-- Name: objects Users can upload evidence; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can upload evidence" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'evidence'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));


--
-- Name: objects Users can upload their own avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can upload their own avatars" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));


--
-- Name: objects Users can upload their own documents; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can upload their own documents" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'kyc-documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: objects Users can view their own documents; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can view their own documents" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'kyc-documents'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION "supabase_realtime" WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION "supabase_realtime_messages_publication" WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime challenges; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."challenges";


--
-- Name: supabase_realtime direct_messages; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."direct_messages";


--
-- Name: supabase_realtime friend_requests; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."friend_requests";


--
-- Name: supabase_realtime friendships; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."friendships";


--
-- Name: supabase_realtime match_messages; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_messages";


--
-- Name: supabase_realtime match_results; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_results";


--
-- Name: supabase_realtime profiles; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";


--
-- Name: supabase_realtime tournament_participants; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournament_participants";


--
-- Name: supabase_realtime tournaments; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournaments";


--
-- Name: supabase_realtime world_chat_messages; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."world_chat_messages";


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION "supabase_realtime_messages_publication" ADD TABLE ONLY "realtime"."messages";


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_graphql_placeholder" ON "sql_drop"
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION "extensions"."set_graphql_placeholder"();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_cron_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION "extensions"."grant_pg_cron_access"();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_graphql_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION "extensions"."grant_pg_graphql_access"();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_net_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION "extensions"."grant_pg_net_access"();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "pgrst_ddl_watch" ON "ddl_command_end"
   EXECUTE FUNCTION "extensions"."pgrst_ddl_watch"();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "pgrst_drop_watch" ON "sql_drop"
   EXECUTE FUNCTION "extensions"."pgrst_drop_watch"();


--
-- PostgreSQL database dump complete
--



-- ============================================================
-- SECTION: STORAGE BUCKETS DATA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
avatars	avatars	\N	2026-04-18 18:31:19.409694+00	2026-04-18 18:31:19.409694+00	t	f	\N	\N	\N	STANDARD
evidence	evidence	\N	2026-04-18 18:31:19.409694+00	2026-04-18 18:31:19.409694+00	f	f	\N	\N	\N	STANDARD
tournament_screenshots	tournament_screenshots	\N	2026-04-21 11:03:23.250524+00	2026-04-21 11:03:23.250524+00	t	f	\N	\N	\N	STANDARD
kyc-documents	kyc-documents	\N	2026-05-25 16:49:26.753535+00	2026-05-25 16:49:26.753535+00	f	f	\N	\N	\N	STANDARD
\.


--
-- PostgreSQL database dump complete
--


