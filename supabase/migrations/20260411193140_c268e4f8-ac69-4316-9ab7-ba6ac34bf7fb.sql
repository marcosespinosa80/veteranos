
-- Sequence for correlative carnet numbers
CREATE SEQUENCE IF NOT EXISTS public.carnet_numero_seq START 1;

-- Add numero_carnet column
ALTER TABLE public.carnets
  ADD COLUMN numero_carnet BIGINT UNIQUE;

-- Backfill existing carnets with correlative numbers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.carnets
)
UPDATE public.carnets c
SET numero_carnet = n.rn
FROM numbered n
WHERE c.id = n.id;

-- Set sequence to continue after existing carnets
SELECT setval('public.carnet_numero_seq', COALESCE((SELECT MAX(numero_carnet) FROM public.carnets), 0) + 1, false);

-- Now make it NOT NULL with default
ALTER TABLE public.carnets
  ALTER COLUMN numero_carnet SET NOT NULL,
  ALTER COLUMN numero_carnet SET DEFAULT nextval('public.carnet_numero_seq');

-- Add suspendido_fechas to jugadores
ALTER TABLE public.jugadores
  ADD COLUMN suspendido_fechas INTEGER NOT NULL DEFAULT 0;
