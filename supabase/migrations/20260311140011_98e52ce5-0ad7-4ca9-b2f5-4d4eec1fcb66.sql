
-- 1. Add es_delegado column to jugadores
ALTER TABLE public.jugadores ADD COLUMN es_delegado boolean NOT NULL DEFAULT false;

-- 2. Drop old FK constraints referencing profiles
ALTER TABLE public.equipos DROP CONSTRAINT IF EXISTS equipos_delegado_1_fkey;
ALTER TABLE public.equipos DROP CONSTRAINT IF EXISTS equipos_delegado_2_fkey;

-- 3. Add new FK constraints referencing jugadores
ALTER TABLE public.equipos 
  ADD CONSTRAINT equipos_delegado_1_jugador_fkey FOREIGN KEY (delegado_1) REFERENCES public.jugadores(id) ON DELETE SET NULL,
  ADD CONSTRAINT equipos_delegado_2_jugador_fkey FOREIGN KEY (delegado_2) REFERENCES public.jugadores(id) ON DELETE SET NULL;

-- 4. Validation trigger: delegado must belong to same equipo and be habilitado
CREATE OR REPLACE FUNCTION public.validar_delegado_equipo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_equipo_id_1 uuid;
  v_estado_1 text;
  v_equipo_id_2 uuid;
  v_estado_2 text;
BEGIN
  -- Validate delegado_1
  IF NEW.delegado_1 IS NOT NULL THEN
    SELECT equipo_id, estado INTO v_equipo_id_1, v_estado_1 FROM public.jugadores WHERE id = NEW.delegado_1;
    IF v_equipo_id_1 IS NULL OR v_equipo_id_1 != NEW.id THEN
      RAISE EXCEPTION 'El delegado 1 debe ser un jugador del mismo equipo';
    END IF;
    IF v_estado_1 != 'habilitado' THEN
      RAISE EXCEPTION 'El delegado 1 debe estar habilitado';
    END IF;
  END IF;

  -- Validate delegado_2
  IF NEW.delegado_2 IS NOT NULL THEN
    SELECT equipo_id, estado INTO v_equipo_id_2, v_estado_2 FROM public.jugadores WHERE id = NEW.delegado_2;
    IF v_equipo_id_2 IS NULL OR v_equipo_id_2 != NEW.id THEN
      RAISE EXCEPTION 'El delegado 2 debe ser un jugador del mismo equipo';
    END IF;
    IF v_estado_2 != 'habilitado' THEN
      RAISE EXCEPTION 'El delegado 2 debe estar habilitado';
    END IF;
  END IF;

  -- Same player can't be both delegates
  IF NEW.delegado_1 IS NOT NULL AND NEW.delegado_2 IS NOT NULL AND NEW.delegado_1 = NEW.delegado_2 THEN
    RAISE EXCEPTION 'El delegado 1 y 2 no pueden ser el mismo jugador';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_delegado_equipo
  BEFORE INSERT OR UPDATE ON public.equipos
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_delegado_equipo();

-- 5. Unique constraint: a jugador can only be delegado of one team at a time
-- We handle this via a trigger that checks across equipos
CREATE OR REPLACE FUNCTION public.validar_delegado_unico()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.delegado_1 IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.equipos 
    WHERE id != NEW.id AND (delegado_1 = NEW.delegado_1 OR delegado_2 = NEW.delegado_1);
    IF v_count > 0 THEN
      RAISE EXCEPTION 'El jugador ya es delegado en otro equipo';
    END IF;
  END IF;

  IF NEW.delegado_2 IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.equipos 
    WHERE id != NEW.id AND (delegado_1 = NEW.delegado_2 OR delegado_2 = NEW.delegado_2);
    IF v_count > 0 THEN
      RAISE EXCEPTION 'El jugador ya es delegado en otro equipo';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_delegado_unico
  BEFORE INSERT OR UPDATE ON public.equipos
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_delegado_unico();

-- 6. Auto-unassign delegado when jugador changes equipo (pase)
CREATE OR REPLACE FUNCTION public.auto_desasignar_delegado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- If equipo_id changed, remove this jugador as delegado from old team
  IF OLD.equipo_id IS DISTINCT FROM NEW.equipo_id AND OLD.equipo_id IS NOT NULL THEN
    UPDATE public.equipos SET delegado_1 = NULL WHERE id = OLD.equipo_id AND delegado_1 = OLD.id;
    UPDATE public.equipos SET delegado_2 = NULL WHERE id = OLD.equipo_id AND delegado_2 = OLD.id;
    NEW.es_delegado := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_desasignar_delegado
  BEFORE UPDATE ON public.jugadores
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_desasignar_delegado();

-- 7. Sync es_delegado flag on equipos changes
CREATE OR REPLACE FUNCTION public.sync_es_delegado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Unmark old delegates
  IF OLD.delegado_1 IS NOT NULL AND (OLD.delegado_1 IS DISTINCT FROM NEW.delegado_1) THEN
    UPDATE public.jugadores SET es_delegado = false WHERE id = OLD.delegado_1;
  END IF;
  IF OLD.delegado_2 IS NOT NULL AND (OLD.delegado_2 IS DISTINCT FROM NEW.delegado_2) THEN
    UPDATE public.jugadores SET es_delegado = false WHERE id = OLD.delegado_2;
  END IF;

  -- Mark new delegates
  IF NEW.delegado_1 IS NOT NULL THEN
    UPDATE public.jugadores SET es_delegado = true WHERE id = NEW.delegado_1;
  END IF;
  IF NEW.delegado_2 IS NOT NULL THEN
    UPDATE public.jugadores SET es_delegado = true WHERE id = NEW.delegado_2;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_es_delegado
  AFTER INSERT OR UPDATE ON public.equipos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_es_delegado();
