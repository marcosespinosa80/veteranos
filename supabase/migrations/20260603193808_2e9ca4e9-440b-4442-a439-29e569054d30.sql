
-- 1) Link profiles to jugadores
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS jugador_id uuid NULL REFERENCES public.jugadores(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_jugador_id_unique
  ON public.profiles (jugador_id) WHERE jugador_id IS NOT NULL;

-- 2) Extend auto_desasignar_delegado: when a player who was delegate changes team,
--    deactivate linked profile and remove delegado role.
CREATE OR REPLACE FUNCTION public.auto_desasignar_delegado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_was_delegado boolean := COALESCE(OLD.es_delegado, false);
BEGIN
  IF OLD.equipo_id IS DISTINCT FROM NEW.equipo_id AND OLD.equipo_id IS NOT NULL THEN
    UPDATE public.equipos SET delegado_1 = NULL WHERE id = OLD.equipo_id AND delegado_1 = OLD.id;
    UPDATE public.equipos SET delegado_2 = NULL WHERE id = OLD.equipo_id AND delegado_2 = OLD.id;
    NEW.es_delegado := false;

    IF v_was_delegado THEN
      SELECT id INTO v_profile_id FROM public.profiles WHERE jugador_id = OLD.id LIMIT 1;
      IF v_profile_id IS NOT NULL THEN
        UPDATE public.profiles SET activo = false WHERE id = v_profile_id;
        DELETE FROM public.user_roles WHERE user_id = v_profile_id AND role = 'delegado';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
