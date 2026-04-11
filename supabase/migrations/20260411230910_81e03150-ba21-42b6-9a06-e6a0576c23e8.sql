
-- Function to advance season: shifts all birth-year ranges by +1 and recalculates all players
CREATE OR REPLACE FUNCTION public.avanzar_temporada()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Shift all birth-year ranges by +1
  UPDATE public.categoria_reglas_2026
  SET anio_nacimiento_desde = anio_nacimiento_desde + 1,
      anio_nacimiento_hasta = anio_nacimiento_hasta + 1;

  -- Recalculate categoria_id for all players
  UPDATE public.jugadores
  SET categoria_id = public.calcular_categoria(fecha_nacimiento);
END;
$$;
