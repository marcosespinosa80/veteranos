-- Block all changes on items of approved/closed listas
CREATE OR REPLACE FUNCTION public.bloquear_items_lista_aprobada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lista_id uuid;
  v_estado text;
  v_cerrada boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_lista_id := OLD.lista_id;
  ELSE
    v_lista_id := NEW.lista_id;
  END IF;

  SELECT estado::text, cerrada
    INTO v_estado, v_cerrada
    FROM public.listas_buena_fe
    WHERE id = v_lista_id;

  IF v_estado = 'aprobada' OR v_cerrada = true THEN
    RAISE EXCEPTION 'Lista aprobada: no se puede modificar hasta finalizar el campeonato';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_items_lista_aprobada ON public.lista_buena_fe_items;
CREATE TRIGGER trg_bloquear_items_lista_aprobada
BEFORE INSERT OR UPDATE OR DELETE ON public.lista_buena_fe_items
FOR EACH ROW
EXECUTE FUNCTION public.bloquear_items_lista_aprobada();

-- Block updates on listas approved/closed (only updated_at can change implicitly)
CREATE OR REPLACE FUNCTION public.bloquear_update_lista_aprobada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (OLD.estado = 'aprobada' OR OLD.cerrada = true) THEN
    -- Allow only updated_at changes (no real change of business fields)
    IF NEW.estado IS DISTINCT FROM OLD.estado
       OR NEW.cerrada IS DISTINCT FROM OLD.cerrada
       OR NEW.equipo_id IS DISTINCT FROM OLD.equipo_id
       OR NEW.categoria_id IS DISTINCT FROM OLD.categoria_id
       OR NEW.temporada IS DISTINCT FROM OLD.temporada
       OR NEW.creada_por IS DISTINCT FROM OLD.creada_por
       OR NEW.aprobada_por IS DISTINCT FROM OLD.aprobada_por
       OR NEW.fecha_aprobacion IS DISTINCT FROM OLD.fecha_aprobacion
       OR NEW.fecha_envio IS DISTINCT FROM OLD.fecha_envio
       OR NEW.motivo_observacion IS DISTINCT FROM OLD.motivo_observacion
       OR NEW.motivo_rechazo IS DISTINCT FROM OLD.motivo_rechazo THEN
      RAISE EXCEPTION 'Lista aprobada: no se puede modificar hasta finalizar el campeonato';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_update_lista_aprobada ON public.listas_buena_fe;
CREATE TRIGGER trg_bloquear_update_lista_aprobada
BEFORE UPDATE ON public.listas_buena_fe
FOR EACH ROW
EXECUTE FUNCTION public.bloquear_update_lista_aprobada();