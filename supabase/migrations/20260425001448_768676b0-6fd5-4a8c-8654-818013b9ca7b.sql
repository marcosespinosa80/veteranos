-- Trigger: prevent adding a player to a roster (lista_buena_fe_items) if that player
-- already belongs to an APPROVED lista of the same season and category in another club.
CREATE OR REPLACE FUNCTION public.validar_jugador_exclusividad_categoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_temporada integer;
  v_categoria_id uuid;
  v_equipo_id uuid;
  v_conflicto_equipo text;
  v_apellido text;
  v_nombre text;
BEGIN
  SELECT temporada, categoria_id, equipo_id
    INTO v_temporada, v_categoria_id, v_equipo_id
    FROM public.listas_buena_fe
    WHERE id = NEW.lista_id;

  SELECT e.nombre_equipo
    INTO v_conflicto_equipo
    FROM public.lista_buena_fe_items i
    JOIN public.listas_buena_fe l ON l.id = i.lista_id
    JOIN public.equipos e ON e.id = l.equipo_id
    WHERE i.jugador_id = NEW.jugador_id
      AND l.temporada = v_temporada
      AND l.categoria_id = v_categoria_id
      AND l.estado = 'aprobada'
      AND l.id <> NEW.lista_id
    LIMIT 1;

  IF v_conflicto_equipo IS NOT NULL THEN
    SELECT apellido, nombre INTO v_apellido, v_nombre
      FROM public.jugadores WHERE id = NEW.jugador_id;
    RAISE EXCEPTION 'No se puede agregar a % %: ya integra una lista aprobada en esta categoría/temporada (club: %)',
      COALESCE(v_apellido,''), COALESCE(v_nombre,''), v_conflicto_equipo;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_jugador_exclusividad_categoria ON public.lista_buena_fe_items;
CREATE TRIGGER trg_validar_jugador_exclusividad_categoria
  BEFORE INSERT OR UPDATE ON public.lista_buena_fe_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_jugador_exclusividad_categoria();