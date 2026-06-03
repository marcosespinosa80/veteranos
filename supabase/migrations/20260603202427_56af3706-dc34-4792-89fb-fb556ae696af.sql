DROP POLICY IF EXISTS "Delegados can insert pases for destino" ON public.pases;

CREATE POLICY "Delegados can insert pases from own origin club"
ON public.pases
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'delegado')
  AND club_origen_id = public.get_user_equipo_id(auth.uid())
);