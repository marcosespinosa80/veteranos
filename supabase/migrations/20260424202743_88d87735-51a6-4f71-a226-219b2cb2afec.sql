ALTER TABLE public.listas_buena_fe
  ADD COLUMN IF NOT EXISTS motivo_observacion text,
  ADD COLUMN IF NOT EXISTS motivo_rechazo text;

ALTER TABLE public.listas_buena_fe
  DROP CONSTRAINT IF EXISTS listas_buena_fe_motivo_observacion_len,
  DROP CONSTRAINT IF EXISTS listas_buena_fe_motivo_rechazo_len;

ALTER TABLE public.listas_buena_fe
  ADD CONSTRAINT listas_buena_fe_motivo_observacion_len
    CHECK (motivo_observacion IS NULL OR char_length(motivo_observacion) BETWEEN 1 AND 50),
  ADD CONSTRAINT listas_buena_fe_motivo_rechazo_len
    CHECK (motivo_rechazo IS NULL OR char_length(motivo_rechazo) BETWEEN 1 AND 50);

CREATE OR REPLACE FUNCTION public.validar_motivo_lista_buena_fe()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estado = 'observada' THEN
    IF NEW.motivo_observacion IS NULL OR btrim(NEW.motivo_observacion) = '' THEN
      RAISE EXCEPTION 'Debe indicar un motivo de observación (máx. 50 caracteres)';
    END IF;
  END IF;

  IF NEW.estado = 'rechazada' THEN
    IF NEW.motivo_rechazo IS NULL OR btrim(NEW.motivo_rechazo) = '' THEN
      RAISE EXCEPTION 'Debe indicar un motivo de rechazo (máx. 50 caracteres)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_motivo_lista_buena_fe ON public.listas_buena_fe;
CREATE TRIGGER trg_validar_motivo_lista_buena_fe
BEFORE INSERT OR UPDATE ON public.listas_buena_fe
FOR EACH ROW
EXECUTE FUNCTION public.validar_motivo_lista_buena_fe();