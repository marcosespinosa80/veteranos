-- Trigger: when a club is deactivated, force all its players to activo_club=false
-- and remove them as delegados of that club.
-- Also block setting activo_club=true on a player whose club is inactive.

CREATE OR REPLACE FUNCTION public.handle_club_desactivacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'inactivo' AND (OLD.estado IS DISTINCT FROM 'inactivo') THEN
    -- Force all players of this club to inactive (club)
    UPDATE public.jugadores
      SET activo_club = false,
          es_delegado = false
      WHERE equipo_id = NEW.id;

    -- Unassign delegados of this club
    NEW.delegado_1 := NULL;
    NEW.delegado_2 := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_club_desactivacion ON public.equipos;
CREATE TRIGGER trg_club_desactivacion
  BEFORE UPDATE ON public.equipos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_club_desactivacion();

-- Block reactivating a player to activo_club=true while their club is inactive
CREATE OR REPLACE FUNCTION public.validar_activo_club_vs_equipo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_estado_equipo text;
BEGIN
  IF NEW.activo_club = true AND NEW.equipo_id IS NOT NULL THEN
    SELECT estado::text INTO v_estado_equipo
      FROM public.equipos WHERE id = NEW.equipo_id;
    IF v_estado_equipo = 'inactivo' THEN
      RAISE EXCEPTION 'No se puede marcar al jugador como ACTIVO porque su club está dado de baja';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_activo_club ON public.jugadores;
CREATE TRIGGER trg_validar_activo_club
  BEFORE INSERT OR UPDATE ON public.jugadores
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_activo_club_vs_equipo();