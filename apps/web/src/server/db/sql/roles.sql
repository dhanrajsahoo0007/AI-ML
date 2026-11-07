-- Least-privilege database roles (plan §11.5). NOT a migration and never applied automatically.
--
-- Who runs it: the database owner, by hand, once per Neon branch that serves traffic (production, staging), and
-- again after adding a table that needs a non-default grant. It is idempotent.
--
--   psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/web/src/server/db/sql/roles.sql
--
-- Passwords are never written here: set them in the Neon console (or `ALTER ROLE … PASSWORD` typed into an
-- interactive psql session) and store the resulting URLs only in Cloudflare (Hyperdrive) and GitHub Environment
-- secrets.
--
--   app_rw    Hyperdrive / the Worker. SELECT, INSERT, UPDATE, DELETE on app tables. No DDL. audit_log is
--             append-only. No access to the drizzle migrations schema.
--   migrator  CI only (DATABASE_URL_DIRECT). Owns the schema objects and runs `npm run db:migrate`.
--   readonly  Admin dashboard. SELECT on views only.
--   backup    Nightly pg_dump. Read-only access to every table.
--   The owner role is never used by the app.
--
-- `ALTER DEFAULT PRIVILEGES FOR ROLE migrator` needs membership in migrator. If the owner isn't a member (Postgres
-- 16+ grants only ADMIN to a role's creator), run `GRANT migrator TO CURRENT_USER;` first, or run those lines
-- connected as migrator.

DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['app_rw', 'migrator', 'readonly', 'backup'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', r);
    END IF;
  END LOOP;
END
$$;

-- Nobody gets anything by default.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
DO $$
BEGIN
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_rw, migrator, readonly, backup', current_database());
  -- The drizzle migrator keeps its journal in its own schema ("drizzle"), which it creates.
  EXECUTE format('GRANT CREATE ON DATABASE %I TO migrator', current_database());
END
$$;

-- migrator: DDL in public.
GRANT USAGE, CREATE ON SCHEMA public TO migrator;

-- app_rw: data only.
GRANT USAGE ON SCHEMA public TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;
REVOKE UPDATE, DELETE ON audit_log FROM app_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_rw;
-- Cheap protection against runaway queries from the request path.
ALTER ROLE app_rw SET statement_timeout = '5s';
ALTER ROLE app_rw SET idle_in_transaction_session_timeout = '10s';

-- readonly: views only (add new admin views here).
GRANT USAGE ON SCHEMA public TO readonly;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM readonly;
GRANT SELECT ON current_entitlement TO readonly;
ALTER ROLE readonly SET default_transaction_read_only = on;

-- backup: read everything for pg_dump, write nothing.
GRANT USAGE ON SCHEMA public TO backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup;
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public GRANT SELECT ON TABLES TO backup;
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public GRANT SELECT ON SEQUENCES TO backup;
ALTER ROLE backup SET default_transaction_read_only = on;
