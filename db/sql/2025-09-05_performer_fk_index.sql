-- Ensure performer_id_user_id column exists with proper FK constraint and index
-- This script handles the mapping from performerId ORM field to performer_id_user_id DB column

DO $$ 
BEGIN
  -- Add the column if it doesn't exist (renaming from performer_id if needed)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'qc_runs' AND column_name = 'performer_id' 
             AND table_schema = 'public') THEN
    -- Rename existing performer_id column to performer_id_user_id
    ALTER TABLE public.qc_runs RENAME COLUMN performer_id TO performer_id_user_id;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'qc_runs' AND column_name = 'performer_id_user_id' 
                    AND table_schema = 'public') THEN
    -- Add the column if neither exists
    ALTER TABLE public.qc_runs ADD COLUMN performer_id_user_id UUID;
  END IF;

  -- Ensure foreign key constraint exists
  BEGIN
    ALTER TABLE public.qc_runs
      ADD CONSTRAINT fk_qc_runs_performer
      FOREIGN KEY (performer_id_user_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  EXCEPTION 
    WHEN duplicate_object THEN 
      NULL; -- Constraint already exists
  END;

  -- Create index for performance
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_qc_runs_performer ON public.qc_runs(performer_id_user_id)';
  
END $$;