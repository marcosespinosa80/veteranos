
DROP POLICY IF EXISTS "Delegados can update own team jugadores" ON public.jugadores;
CREATE POLICY "Delegados can update own team jugadores"
ON public.jugadores
FOR UPDATE
USING (has_role(auth.uid(), 'delegado'::app_role) AND equipo_id = get_user_equipo_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'delegado'::app_role) AND equipo_id = get_user_equipo_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.restrict_delegado_jugadores_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin_general'::app_role)
     OR has_role(auth.uid(), 'admin_comun'::app_role) THEN
    RETURN NEW;
  END IF;
  IF has_role(auth.uid(), 'delegado'::app_role) THEN
    IF NEW.estado IS DISTINCT FROM OLD.estado
       OR NEW.apto_medico IS DISTINCT FROM OLD.apto_medico
       OR NEW.suspendido_fechas IS DISTINCT FROM OLD.suspendido_fechas
       OR NEW.categoria_id IS DISTINCT FROM OLD.categoria_id
       OR NEW.equipo_id IS DISTINCT FROM OLD.equipo_id
       OR NEW.activo_club IS DISTINCT FROM OLD.activo_club
       OR NEW.es_delegado IS DISTINCT FROM OLD.es_delegado
       OR NEW.numero_carnet IS DISTINCT FROM OLD.numero_carnet THEN
      RAISE EXCEPTION 'Los delegados no pueden modificar campos sensibles del jugador';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_delegado_jugadores_update ON public.jugadores;
CREATE TRIGGER trg_restrict_delegado_jugadores_update
BEFORE UPDATE ON public.jugadores
FOR EACH ROW EXECUTE FUNCTION public.restrict_delegado_jugadores_update();

DROP POLICY IF EXISTS "Delegados can manage own team listas" ON public.listas_buena_fe;

CREATE POLICY "Delegados can read own team listas"
ON public.listas_buena_fe
FOR SELECT
USING (has_role(auth.uid(), 'delegado'::app_role) AND equipo_id = get_user_equipo_id(auth.uid()));

CREATE POLICY "Delegados can insert own team listas"
ON public.listas_buena_fe
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'delegado'::app_role)
  AND equipo_id = get_user_equipo_id(auth.uid())
  AND estado = 'borrador'::estado_lista
  AND COALESCE(cerrada, false) = false
  AND firmada IS NOT TRUE
  AND aprobada_por IS NULL
  AND fecha_aprobacion IS NULL
);

CREATE POLICY "Delegados can update own team listas"
ON public.listas_buena_fe
FOR UPDATE
USING (
  has_role(auth.uid(), 'delegado'::app_role)
  AND equipo_id = get_user_equipo_id(auth.uid())
  AND estado IN ('borrador'::estado_lista, 'observada'::estado_lista)
  AND COALESCE(cerrada, false) = false
)
WITH CHECK (
  has_role(auth.uid(), 'delegado'::app_role)
  AND equipo_id = get_user_equipo_id(auth.uid())
  AND estado IN ('borrador'::estado_lista, 'enviada'::estado_lista)
  AND COALESCE(cerrada, false) = false
);

CREATE POLICY "Delegados can delete own team draft listas"
ON public.listas_buena_fe
FOR DELETE
USING (
  has_role(auth.uid(), 'delegado'::app_role)
  AND equipo_id = get_user_equipo_id(auth.uid())
  AND estado = 'borrador'::estado_lista
  AND COALESCE(cerrada, false) = false
);

CREATE OR REPLACE FUNCTION public.restrict_delegado_listas_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin_general'::app_role)
     OR has_role(auth.uid(), 'admin_comun'::app_role) THEN
    RETURN NEW;
  END IF;
  IF has_role(auth.uid(), 'delegado'::app_role) THEN
    IF NEW.firmada IS DISTINCT FROM OLD.firmada
       OR NEW.aprobada_por IS DISTINCT FROM OLD.aprobada_por
       OR NEW.fecha_aprobacion IS DISTINCT FROM OLD.fecha_aprobacion
       OR NEW.cerrada IS DISTINCT FROM OLD.cerrada
       OR NEW.motivo_observacion IS DISTINCT FROM OLD.motivo_observacion
       OR NEW.motivo_rechazo IS DISTINCT FROM OLD.motivo_rechazo
       OR NEW.equipo_id IS DISTINCT FROM OLD.equipo_id
       OR NEW.categoria_id IS DISTINCT FROM OLD.categoria_id
       OR NEW.temporada IS DISTINCT FROM OLD.temporada THEN
      RAISE EXCEPTION 'Los delegados no pueden modificar campos de aprobación de la lista';
    END IF;
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      IF NOT (
        (OLD.estado = 'borrador'::estado_lista AND NEW.estado IN ('borrador'::estado_lista, 'enviada'::estado_lista))
        OR (OLD.estado = 'observada'::estado_lista AND NEW.estado = 'enviada'::estado_lista)
      ) THEN
        RAISE EXCEPTION 'Transición de estado no permitida para delegados';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_delegado_listas_update ON public.listas_buena_fe;
CREATE TRIGGER trg_restrict_delegado_listas_update
BEFORE UPDATE ON public.listas_buena_fe
FOR EACH ROW EXECUTE FUNCTION public.restrict_delegado_listas_update();

DROP POLICY IF EXISTS "Delegados read own club certificados" ON storage.objects;
CREATE POLICY "Delegados read own club certificados"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'certificados-medicos'
  AND has_role(auth.uid(), 'delegado'::app_role)
  AND (storage.foldername(name))[1] = (get_user_equipo_id(auth.uid()))::text
);
