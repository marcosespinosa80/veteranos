-- Add motivo columns to pases
ALTER TABLE public.pases
  ADD COLUMN IF NOT EXISTS motivo_observacion text NULL,
  ADD COLUMN IF NOT EXISTS motivo_rechazo text NULL;

-- Length check constraints (max 50 chars)
ALTER TABLE public.pases
  DROP CONSTRAINT IF EXISTS pases_motivo_observacion_len_chk;
ALTER TABLE public.pases
  ADD CONSTRAINT pases_motivo_observacion_len_chk
  CHECK (motivo_observacion IS NULL OR char_length(motivo_observacion) BETWEEN 1 AND 50);

ALTER TABLE public.pases
  DROP CONSTRAINT IF EXISTS pases_motivo_rechazo_len_chk;
ALTER TABLE public.pases
  ADD CONSTRAINT pases_motivo_rechazo_len_chk
  CHECK (motivo_rechazo IS NULL OR char_length(motivo_rechazo) BETWEEN 1 AND 50);

-- Trigger function to enforce motivo when estado is observado/rechazado
CREATE OR REPLACE FUNCTION public.validar_motivo_pase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.estado = 'observado' THEN
    IF NEW.motivo_observacion IS NULL OR btrim(NEW.motivo_observacion) = '' THEN
      RAISE EXCEPTION 'Debe indicar un motivo de observación (máx. 50 caracteres)';
    END IF;
  END IF;

  IF NEW.estado = 'rechazado' THEN
    IF NEW.motivo_rechazo IS NULL OR btrim(NEW.motivo_rechazo) = '' THEN
      RAISE EXCEPTION 'Debe indicar un motivo de rechazo (máx. 50 caracteres)';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_motivo_pase ON public.pases;
CREATE TRIGGER trg_validar_motivo_pase
  BEFORE INSERT OR UPDATE ON public.pases
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_motivo_pase();