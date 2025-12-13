-- scripts/postgres-init.sql
-- Database initialization for Neural Feed Studio RAG

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application role with limited permissions
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'neural_feed_app') THEN
      CREATE ROLE neural_feed_app WITH LOGIN PASSWORD 'app_password';
   END IF;
END
$$;

-- Grant basic permissions
GRANT CONNECT ON DATABASE neural_feed_dev TO neural_feed_app;
GRANT USAGE ON SCHEMA public TO neural_feed_app;
GRANT CREATE ON SCHEMA public TO neural_feed_app;

-- Create development helper functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';