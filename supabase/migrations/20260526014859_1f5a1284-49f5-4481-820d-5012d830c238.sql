
-- Tighten SELECT on private buckets
DROP POLICY IF EXISTS "Auth read certificados" ON storage.objects;
CREATE POLICY "Admins read certificados"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'certificados-medicos' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

DROP POLICY IF EXISTS "Auth read recibos" ON storage.objects;
CREATE POLICY "Admins read recibos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'recibos-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
  )
);

DROP POLICY IF EXISTS "Auth read formularios pases" ON storage.objects;
CREATE POLICY "Admins and delegados read formularios"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'formularios-pases' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR (
      public.has_role(auth.uid(),'delegado')
      AND EXISTS (
        SELECT 1 FROM public.pases p
        WHERE p.archivo_formulario_url IS NOT NULL
          AND position(storage.objects.name in p.archivo_formulario_url) > 0
          AND (
            p.club_origen_id = public.get_user_equipo_id(auth.uid())
            OR p.club_destino_id = public.get_user_equipo_id(auth.uid())
          )
      )
    )
  )
);

-- Restrict delegados to update only fotos under their club folder (path prefix = equipo_id/...)
DROP POLICY IF EXISTS "Admins and delegados update fotos" ON storage.objects;
CREATE POLICY "Admins update any fotos, delegados only own club"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'fotos-jugadores' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR (
      public.has_role(auth.uid(),'delegado')
      AND (storage.foldername(name))[1] = public.get_user_equipo_id(auth.uid())::text
    )
  )
)
WITH CHECK (
  bucket_id = 'fotos-jugadores' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR (
      public.has_role(auth.uid(),'delegado')
      AND (storage.foldername(name))[1] = public.get_user_equipo_id(auth.uid())::text
    )
  )
);

-- Same scoping for INSERT (delegado can only upload into own club folder)
DROP POLICY IF EXISTS "Admins and delegados upload fotos" ON storage.objects;
CREATE POLICY "Admins upload any fotos, delegados only own club"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fotos-jugadores' AND (
    public.has_role(auth.uid(),'admin_general')
    OR public.has_role(auth.uid(),'admin_comun')
    OR (
      public.has_role(auth.uid(),'delegado')
      AND (storage.foldername(name))[1] = public.get_user_equipo_id(auth.uid())::text
    )
  )
);
