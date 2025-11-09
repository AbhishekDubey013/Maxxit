-- Add OSTIUM to venue_t enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'OSTIUM' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'venue_t'
        )
    ) THEN
        ALTER TYPE venue_t ADD VALUE 'OSTIUM';
    END IF;
END $$;

