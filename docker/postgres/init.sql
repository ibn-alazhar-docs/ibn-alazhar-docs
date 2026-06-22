-- Ibn Al-Azhar Docs — PostgreSQL initialization
-- Runs once on first container start

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE DATABASE ibn_docs_verify;
