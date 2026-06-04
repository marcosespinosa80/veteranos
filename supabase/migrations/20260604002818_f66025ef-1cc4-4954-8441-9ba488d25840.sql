-- Scope delegado policies to authenticated role
DROP POLICY IF EXISTS "Delegados can update own team jugadores" ON public.jugadores;
CREATE POLICY "Delegados can update own team jugadores" ON public.jugadores
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'delegado'::app_role) AND (equipo_id = get_user_equipo_id(auth.uid())))
  WITH CHECK (has_role(auth.uid(), 'delegado'::app_role) AND (equipo_id = get_user_equipo_id(auth.uid())));

DROP POLICY IF EXISTS "Delegados can read own team listas" ON public.listas_buena_fe;
CREATE POLICY "Delegados can read own team listas" ON public.listas_buena_fe
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'delegado'::app_role) AND (equipo_id = get_user_equipo_id(auth.uid())));

DROP POLICY IF EXISTS "Delegados can insert own team listas" ON public.listas_buena_fe;
CREATE POLICY "Delegados can insert own team listas" ON public.listas_buena_fe
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'delegado'::app_role)
    AND (equipo_id = get_user_equipo_id(auth.uid()))
    AND (estado = 'borrador'::estado_lista)
    AND (COALESCE(cerrada, false) = false)
    AND (firmada IS NOT TRUE)
    AND (aprobada_por IS NULL)
    AND (fecha_aprobacion IS NULL)
  );

DROP POLICY IF EXISTS "Delegados can update own team listas" ON public.listas_buena_fe;
CREATE POLICY "Delegados can update own team listas" ON public.listas_buena_fe
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'delegado'::app_role)
    AND (equipo_id = get_user_equipo_id(auth.uid()))
    AND (estado = ANY (ARRAY['borrador'::estado_lista, 'observada'::estado_lista]))
    AND (COALESCE(cerrada, false) = false)
  )
  WITH CHECK (
    has_role(auth.uid(), 'delegado'::app_role)
    AND (equipo_id = get_user_equipo_id(auth.uid()))
    AND (estado = ANY (ARRAY['borrador'::estado_lista, 'enviada'::estado_lista]))
    AND (COALESCE(cerrada, false) = false)
  );

DROP POLICY IF EXISTS "Delegados can delete own team draft listas" ON public.listas_buena_fe;
CREATE POLICY "Delegados can delete own team draft listas" ON public.listas_buena_fe
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'delegado'::app_role)
    AND (equipo_id = get_user_equipo_id(auth.uid()))
    AND (estado = 'borrador'::estado_lista)
    AND (COALESCE(cerrada, false) = false)
  );

-- Allow delegados to read recibos-pases for their own club's pases
CREATE POLICY "Admins and delegados read recibos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'recibos-pases'
    AND (
      has_role(auth.uid(), 'admin_general'::app_role)
      OR has_role(auth.uid(), 'admin_comun'::app_role)
      OR (
        has_role(auth.uid(), 'delegado'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.pases p
          WHERE p.recibo_url IS NOT NULL
            AND POSITION(objects.name IN p.recibo_url) > 0
            AND (p.club_origen_id = get_user_equipo_id(auth.uid())
                 OR p.club_destino_id = get_user_equipo_id(auth.uid()))
        )
      )
    )
  );