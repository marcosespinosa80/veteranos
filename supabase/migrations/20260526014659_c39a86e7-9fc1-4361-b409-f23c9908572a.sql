
-- 1) CARGOS: restrict SELECT (drop open auth read, add admin + delegado-of-team)
DROP POLICY IF EXISTS "Authenticated can read cargos" ON public.cargos;

CREATE POLICY "Admins can read cargos"
ON public.cargos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin_general') OR public.has_role(auth.uid(),'admin_comun'));

CREATE POLICY "Delegados can read own team cargos"
ON public.cargos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'delegado') AND (
    equipo_id = public.get_user_equipo_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jugadores j
      WHERE j.id = cargos.jugador_id
        AND j.equipo_id = public.get_user_equipo_id(auth.uid())
    )
  )
);

-- 2) PAGOS: restrict SELECT to admins only (delegados don't need history)
DROP POLICY IF EXISTS "Authenticated can read pagos" ON public.pagos;
DROP POLICY IF EXISTS "Authenticated can read pago_items" ON public.pago_items;

CREATE POLICY "Admins can read pagos"
ON public.pagos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin_general') OR public.has_role(auth.uid(),'admin_comun'));

CREATE POLICY "Admins can read pago_items"
ON public.pago_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin_general') OR public.has_role(auth.uid(),'admin_comun'));

-- 3) SECURITY DEFINER functions: revoke EXECUTE from anon/public on all definer functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_update_lista_aprobada() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_club_desactivacion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_jugador_lista_buena_fe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_items_lista_aprobada() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_jugador_exclusividad_categoria() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.avanzar_temporada() FROM PUBLIC, anon, authenticated;

-- Helpers used by RLS: revoke from anon, keep for authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_equipo_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calcular_categoria(date) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_equipo_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_categoria(date) TO authenticated;

-- 4) STORAGE policies hardening

-- fotos-jugadores: restrict INSERT/UPDATE to admins+delegados
DROP POLICY IF EXISTS "Auth upload fotos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update fotos" ON storage.objects;

CREATE POLICY "Admins and delegados upload fotos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fotos-jugadores' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR public.has_role(auth.uid(),'delegado')
  )
);

CREATE POLICY "Admins and delegados update fotos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'fotos-jugadores' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR public.has_role(auth.uid(),'delegado')
  )
)
WITH CHECK (
  bucket_id = 'fotos-jugadores' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR public.has_role(auth.uid(),'delegado')
  )
);

-- Restrict listing of public buckets to admins (files still public via CDN URL)
DROP POLICY IF EXISTS "Public read fotos jugadores" ON storage.objects;
DROP POLICY IF EXISTS "Public read boletines" ON storage.objects;

CREATE POLICY "Admins list fotos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'fotos-jugadores' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

CREATE POLICY "Admins list boletines"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'boletines' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

-- certificados-medicos: tighten INSERT to admins+delegados (was: any auth)
DROP POLICY IF EXISTS "Auth upload certificados" ON storage.objects;
CREATE POLICY "Admins and delegados upload certificados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificados-medicos' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR public.has_role(auth.uid(),'delegado')
  )
);

-- formularios-pases: tighten INSERT
DROP POLICY IF EXISTS "Auth upload formularios pases" ON storage.objects;
CREATE POLICY "Admins and delegados upload formularios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'formularios-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR public.has_role(auth.uid(),'delegado')
  )
);

-- recibos-pases: tighten INSERT to admins only
DROP POLICY IF EXISTS "Auth upload recibos" ON storage.objects;
CREATE POLICY "Admins upload recibos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recibos-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

-- boletines: tighten INSERT to admins only
DROP POLICY IF EXISTS "Auth upload boletines" ON storage.objects;
CREATE POLICY "Admins upload boletines"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'boletines' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

-- DELETE policies for all buckets: admins only
CREATE POLICY "Admins delete fotos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'fotos-jugadores' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

CREATE POLICY "Admins delete certificados"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'certificados-medicos' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

CREATE POLICY "Admins delete formularios"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'formularios-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

CREATE POLICY "Admins delete recibos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recibos-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

CREATE POLICY "Admins delete boletines"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'boletines' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

-- UPDATE policies for private buckets: admins only
CREATE POLICY "Admins update certificados"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'certificados-medicos' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
)
WITH CHECK (
  bucket_id = 'certificados-medicos' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

CREATE POLICY "Admins update formularios"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'formularios-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
)
WITH CHECK (
  bucket_id = 'formularios-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

CREATE POLICY "Admins update recibos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recibos-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
)
WITH CHECK (
  bucket_id = 'recibos-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

CREATE POLICY "Admins update boletines"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'boletines' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
)
WITH CHECK (
  bucket_id = 'boletines' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);
