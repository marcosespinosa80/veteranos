
-- Remove existing duplicate (empty borrador) before adding constraint
DELETE FROM public.listas_buena_fe WHERE id = 'ce772e08-3c1e-409d-9352-77b8a955f064';

-- Prevent duplicate listas for same equipo + categoria + temporada
ALTER TABLE public.listas_buena_fe
  ADD CONSTRAINT listas_buena_fe_unica_equipo_categoria_temporada
  UNIQUE (equipo_id, categoria_id, temporada);
