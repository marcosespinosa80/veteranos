-- Add recovery_email and must_change_password to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recovery_email text,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Ensure username is unique (case-insensitive on digits-only DNI). Use simple unique.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='profiles_username_unique'
  ) THEN
    CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (username) WHERE username IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='profiles_recovery_email_unique'
  ) THEN
    CREATE UNIQUE INDEX profiles_recovery_email_unique ON public.profiles (lower(recovery_email)) WHERE recovery_email IS NOT NULL;
  END IF;
END $$;