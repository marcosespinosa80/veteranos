
-- 1) Tighten profiles UPDATE to prevent privilege escalation via equipo_id/jugador_id/activo/etc.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile safe fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND equipo_id IS NOT DISTINCT FROM (SELECT p.equipo_id FROM public.profiles p WHERE p.id = auth.uid())
  AND jugador_id IS NOT DISTINCT FROM (SELECT p.jugador_id FROM public.profiles p WHERE p.id = auth.uid())
  AND activo IS NOT DISTINCT FROM (SELECT p.activo FROM public.profiles p WHERE p.id = auth.uid())
  AND must_change_password IS NOT DISTINCT FROM (SELECT p.must_change_password FROM public.profiles p WHERE p.id = auth.uid())
  AND username IS NOT DISTINCT FROM (SELECT p.username FROM public.profiles p WHERE p.id = auth.uid())
  AND recovery_email IS NOT DISTINCT FROM (SELECT p.recovery_email FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2) Drop redundant cargos SELECT policy (covered by "Admins can manage cargos" ALL)
DROP POLICY IF EXISTS "Admins can read cargos" ON public.cargos;

-- 3) Storage: scope delegado uploads to their own equipo_id folder
DROP POLICY IF EXISTS "Admins and delegados upload certificados" ON storage.objects;
CREATE POLICY "Admins and delegados upload certificados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificados-medicos' AND (
    has_role(auth.uid(), 'admin_general'::app_role)
    OR has_role(auth.uid(), 'admin_comun'::app_role)
    OR (
      has_role(auth.uid(), 'delegado'::app_role)
      AND (storage.foldername(name))[1] = (get_user_equipo_id(auth.uid()))::text
    )
  )
);

DROP POLICY IF EXISTS "Admins and delegados upload formularios" ON storage.objects;
CREATE POLICY "Admins and delegados upload formularios"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'formularios-pases' AND (
    has_role(auth.uid(), 'admin_general'::app_role)
    OR has_role(auth.uid(), 'admin_comun'::app_role)
    OR (
      has_role(auth.uid(), 'delegado'::app_role)
      AND (storage.foldername(name))[1] = (get_user_equipo_id(auth.uid()))::text
    )
  )
);
