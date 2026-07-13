-- Ibn Al-Azhar Docs — apply missing privileges to an EXISTING database.
-- Run this (as a superuser, e.g. the postgres role inside the container) when
-- the public schema was created without ibn_docs owning it. This is the manual
-- equivalent of docker/postgres/init.sql for databases that already exist.
--
-- Usage:
--   docker compose exec -T postgres psql -U postgres -d ibn_docs -f /dev/stdin < scripts/fix-db-grants.sql
-- (or copy this file into the container and run it against both databases)

\c ibn_docs
GRANT ALL PRIVILEGES ON DATABASE ibn_docs TO ibn_docs;
GRANT ALL PRIVILEGES ON SCHEMA public TO ibn_docs;
ALTER SCHEMA public OWNER TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO ibn_docs;

\c ibn_docs_verify
GRANT ALL PRIVILEGES ON DATABASE ibn_docs_verify TO ibn_docs;
GRANT ALL PRIVILEGES ON SCHEMA public TO ibn_docs;
ALTER SCHEMA public OWNER TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO ibn_docs;
