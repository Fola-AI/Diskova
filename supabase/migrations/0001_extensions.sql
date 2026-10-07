-- 0001 · Extensions (PRD §6 conventions). All already enabled on DEV; idempotent for PROD.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_partman with schema extensions;
create extension if not exists pgcrypto with schema extensions;
