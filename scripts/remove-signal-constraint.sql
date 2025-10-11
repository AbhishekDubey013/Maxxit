-- Remove the 6h bucket constraint that prevents instant manual trades
-- This constraint was designed for auto signals but breaks manual Telegram trades

-- Check if the constraint/index exists
SELECT
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'signals'::regclass
    AND conname LIKE '%bucket%';

-- If there's a unique constraint, drop it
-- (Exact name might vary, adjust if needed)
-- ALTER TABLE signals DROP CONSTRAINT IF EXISTS signals_agent_id_token_symbol_bucket_6h_utc_created_at_key;

-- If there's a unique index instead, drop it
DROP INDEX IF EXISTS signals_agent_id_token_symbol_bucket_6h_utc_created_at_idx;
DROP INDEX IF EXISTS idx_signals_agent_token_6h;

-- Verify it's gone
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'signals'
    AND indexdef LIKE '%bucket%';

