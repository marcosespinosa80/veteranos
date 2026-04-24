-- Trigger to block adding suspended players or players with pending debt to lista_buena_fe_items
CREATE OR REPLACE FUNCTION public.validar_jugador_lista_buena_fe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_suspendido integer;
  v_apellido text;
  v_nombre text;
  v_tiene_deuda boolean;
BEGIN
  SELECT suspendido_fechas, apellido, nombre
    INTO v_suspendido, v_apellido, v_nombre
    FROM public.jugadores
    WHERE id = NEW.jugador_id;

  IF v_suspendido IS NOT NULL AND v_suspendido > 0 THEN
    RAISE EXCEPTION 'No se puede incluir a % % en la lista: tiene % fecha(s) de suspensión', v_apellido, v_nombre, v_suspendido;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cargos
    WHERE jugador_id = NEW.jugador_id AND estado_pago = 'pendiente'
  ) INTO v_tiene_deuda;

  IF v_tiene_deuda THEN
    RAISE EXCEPTION 'No se puede incluir a % % en la lista: tiene deuda pendiente', v_apellido, v_nombre;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_jugador_lista_buena_fe ON public.lista_buena_fe_items;
CREATE TRIGGER trg_validar_jugador_lista_buena_fe
BEFORE INSERT OR UPDATE ON public.lista_buena_fe_items
FOR EACH ROW
EXECUTE FUNCTION public.validar_jugador_lista_buena_fe();