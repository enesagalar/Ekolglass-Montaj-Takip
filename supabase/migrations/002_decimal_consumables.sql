-- ============================================================
-- Migration 002 — Decimal stock for consumables
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Allow fractional consumable stock (e.g. 3.5 silikon per vehicle)
ALTER TABLE consumables ALTER COLUMN stock TYPE numeric(10,1);

-- Also update the decrement function to handle decimals for consumables
-- (glass stock remains integer via separate function)
