-- Ibn Al-Azhar Docs — PostgreSQL initialization
-- Runs ONCE on first container start (only when the data volume is empty).

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Secondary database used by the integrity/verification worker
CREATE DATABASE ibn_docs_verify;

-- The official postgres image creates POSTGRES_USER (ibn_docs) as a superuser,
-- BUT PostgreSQL 15+ revokes CREATE on the public schema from non-owners.
-- That left ibn_docs unable to INSERT/migrate, surfacing as
-- "P1010: User ibn_docs was denied access on the database ibn_docs.public".
-- We make ibn_docs the OWNER of public in both databases and grant default
-- privileges so Prisma migrations and runtime writes always succeed.
GRANT ALL PRIVILEGES ON DATABASE ibn_docs TO ibn_docs;
GRANT ALL PRIVILEGES ON SCHEMA public TO ibn_docs;
ALTER SCHEMA public OWNER TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO ibn_docs;

-- Same guarantees for the verification database
\c ibn_docs_verify
GRANT ALL PRIVILEGES ON DATABASE ibn_docs_verify TO ibn_docs;
GRANT ALL PRIVILEGES ON SCHEMA public TO ibn_docs;
ALTER SCHEMA public OWNER TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ibn_docs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO ibn_docs;
