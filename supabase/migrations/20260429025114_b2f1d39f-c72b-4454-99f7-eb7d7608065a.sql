
-- =========================================================
-- MÓDULO TORNEO — TABLAS BASE
-- =========================================================

-- A) temporadas
CREATE TABLE public.temporadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio integer NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'activa',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.temporadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read temporadas" ON public.temporadas FOR SELECT USING (true);
CREATE POLICY "Admins manage temporadas" ON public.temporadas FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));

-- B) torneos
CREATE TABLE public.torneos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temporada_id uuid NOT NULL REFERENCES public.temporadas(id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (nombre IN ('Apertura','Clausura')),
  estado text NOT NULL DEFAULT 'configuracion' CHECK (estado IN ('configuracion','en_curso','finalizado','archivado')),
  torneo_referencia_id uuid REFERENCES public.torneos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(temporada_id, nombre)
);
ALTER TABLE public.torneos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read torneos" ON public.torneos FOR SELECT USING (true);
CREATE POLICY "Admins manage torneos" ON public.torneos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));
CREATE TRIGGER trg_torneos_updated_at BEFORE UPDATE ON public.torneos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- C) torneo_categorias
CREATE TABLE public.torneo_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id uuid NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.categorias(id),
  estado text NOT NULL DEFAULT 'configuracion',
  cantidad_zonas integer,
  min_equipos_zona integer NOT NULL DEFAULT 7,
  max_equipos_zona integer NOT NULL DEFAULT 10,
  clasificacion_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(torneo_id, categoria_id)
);
ALTER TABLE public.torneo_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read torneo_categorias" ON public.torneo_categorias FOR SELECT USING (true);
CREATE POLICY "Admins manage torneo_categorias" ON public.torneo_categorias FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));
CREATE TRIGGER trg_torneo_categorias_updated_at BEFORE UPDATE ON public.torneo_categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- D) torneo_equipos
CREATE TABLE public.torneo_equipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_categoria_id uuid NOT NULL REFERENCES public.torneo_categorias(id) ON DELETE CASCADE,
  equipo_id uuid NOT NULL REFERENCES public.equipos(id),
  posicion_referencia integer,
  origen_referencia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(torneo_categoria_id, equipo_id)
);
ALTER TABLE public.torneo_equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read torneo_equipos" ON public.torneo_equipos FOR SELECT USING (true);
CREATE POLICY "Admins manage torneo_equipos" ON public.torneo_equipos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));

-- E) zonas
CREATE TABLE public.zonas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_categoria_id uuid NOT NULL REFERENCES public.torneo_categorias(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read zonas" ON public.zonas FOR SELECT USING (true);
CREATE POLICY "Admins manage zonas" ON public.zonas FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));

-- F) zona_equipos
CREATE TABLE public.zona_equipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id uuid NOT NULL REFERENCES public.zonas(id) ON DELETE CASCADE,
  equipo_id uuid NOT NULL REFERENCES public.equipos(id),
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(zona_id, equipo_id)
);
ALTER TABLE public.zona_equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read zona_equipos" ON public.zona_equipos FOR SELECT USING (true);
CREATE POLICY "Admins manage zona_equipos" ON public.zona_equipos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));

-- G) fechas_torneo
CREATE TABLE public.fechas_torneo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_categoria_id uuid NOT NULL REFERENCES public.torneo_categorias(id) ON DELETE CASCADE,
  zona_id uuid REFERENCES public.zonas(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  nombre text,
  fase text NOT NULL DEFAULT 'grupos' CHECK (fase IN ('grupos','octavos','cuartos','semifinal','final','posicionamiento')),
  fecha_calendario date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fechas_torneo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read fechas_torneo" ON public.fechas_torneo FOR SELECT USING (true);
CREATE POLICY "Admins manage fechas_torneo" ON public.fechas_torneo FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));

-- H) partidos
CREATE TABLE public.partidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id uuid NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
  torneo_categoria_id uuid NOT NULL REFERENCES public.torneo_categorias(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.categorias(id),
  zona_id uuid REFERENCES public.zonas(id) ON DELETE SET NULL,
  fecha_torneo_id uuid REFERENCES public.fechas_torneo(id) ON DELETE SET NULL,
  fase text NOT NULL DEFAULT 'grupos' CHECK (fase IN ('grupos','octavos','cuartos','semifinal','final','posicionamiento')),
  fecha_numero integer,
  equipo_local_id uuid REFERENCES public.equipos(id),
  equipo_visitante_id uuid REFERENCES public.equipos(id),
  equipo_libre_id uuid REFERENCES public.equipos(id),
  cancha_id uuid REFERENCES public.canchas(id),
  cancha_texto text,
  dia date,
  hora time,
  arbitro_user_id uuid REFERENCES public.profiles(id),
  goles_local integer,
  goles_visitante integer,
  hubo_penales boolean NOT NULL DEFAULT false,
  penales_local integer,
  penales_visitante integer,
  ganador_id uuid REFERENCES public.equipos(id),
  estado text NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado','jugado','suspendido','cargado','confirmado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read partidos" ON public.partidos FOR SELECT USING (true);
CREATE POLICY "Admins manage partidos" ON public.partidos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));
CREATE POLICY "Arbitros can update assigned partidos" ON public.partidos FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'arbitro'::app_role) AND arbitro_user_id = auth.uid())
  WITH CHECK (has_role(auth.uid(),'arbitro'::app_role) AND arbitro_user_id = auth.uid());
CREATE TRIGGER trg_partidos_updated_at BEFORE UPDATE ON public.partidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_partidos_torneo_cat ON public.partidos(torneo_categoria_id);
CREATE INDEX idx_partidos_zona ON public.partidos(zona_id);
CREATE INDEX idx_partidos_fecha ON public.partidos(fecha_torneo_id);

-- Validation: no draws when partido is jugado/cargado/confirmado
CREATE OR REPLACE FUNCTION public.validar_partido_resultado()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.estado IN ('jugado','cargado','confirmado') THEN
    IF NEW.goles_local IS NULL OR NEW.goles_visitante IS NULL THEN
      RAISE EXCEPTION 'Debe cargar goles de local y visitante';
    END IF;
    IF NEW.goles_local = NEW.goles_visitante THEN
      IF NEW.hubo_penales IS NOT TRUE THEN
        RAISE EXCEPTION 'Empate no permitido: debe definirse por penales';
      END IF;
      IF NEW.penales_local IS NULL OR NEW.penales_visitante IS NULL OR NEW.penales_local = NEW.penales_visitante THEN
        RAISE EXCEPTION 'Debe cargar penales con un ganador';
      END IF;
      IF NEW.ganador_id IS NULL THEN
        RAISE EXCEPTION 'Debe definir el ganador por penales';
      END IF;
    ELSE
      -- Auto-set ganador by goals
      NEW.ganador_id := CASE WHEN NEW.goles_local > NEW.goles_visitante THEN NEW.equipo_local_id ELSE NEW.equipo_visitante_id END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validar_partido_resultado BEFORE INSERT OR UPDATE ON public.partidos
  FOR EACH ROW EXECUTE FUNCTION public.validar_partido_resultado();

-- I) partido_auditoria
CREATE TABLE public.partido_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id uuid NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  accion text NOT NULL,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  cambiado_por uuid REFERENCES public.profiles(id),
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partido_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read auditoria" ON public.partido_auditoria FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));
CREATE POLICY "Admins insert auditoria" ON public.partido_auditoria FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));

-- J) planilla_arbitral
CREATE TABLE public.planilla_arbitral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id uuid NOT NULL UNIQUE REFERENCES public.partidos(id) ON DELETE CASCADE,
  arbitro_user_id uuid REFERENCES public.profiles(id),
  enviada boolean NOT NULL DEFAULT false,
  fecha_envio timestamptz,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.planilla_arbitral ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage planilla" ON public.planilla_arbitral FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));
CREATE POLICY "Arbitro manages own planilla" ON public.planilla_arbitral FOR ALL TO authenticated
  USING (has_role(auth.uid(),'arbitro'::app_role) AND arbitro_user_id = auth.uid())
  WITH CHECK (has_role(auth.uid(),'arbitro'::app_role) AND arbitro_user_id = auth.uid());
CREATE POLICY "Tribunal reads planilla" ON public.planilla_arbitral FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'tribunal'::app_role));
CREATE TRIGGER trg_planilla_updated_at BEFORE UPDATE ON public.planilla_arbitral
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- K) planilla_arbitral_items
CREATE TABLE public.planilla_arbitral_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planilla_id uuid NOT NULL REFERENCES public.planilla_arbitral(id) ON DELETE CASCADE,
  jugador_id uuid NOT NULL REFERENCES public.jugadores(id),
  equipo_id uuid NOT NULL REFERENCES public.equipos(id),
  goles integer NOT NULL DEFAULT 0,
  amarillas integer NOT NULL DEFAULT 0,
  rojas integer NOT NULL DEFAULT 0,
  expulsado boolean NOT NULL DEFAULT false,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.planilla_arbitral_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage planilla items" ON public.planilla_arbitral_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));
CREATE POLICY "Arbitro manages own planilla items" ON public.planilla_arbitral_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.planilla_arbitral p WHERE p.id = planilla_id AND p.arbitro_user_id = auth.uid() AND has_role(auth.uid(),'arbitro'::app_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.planilla_arbitral p WHERE p.id = planilla_id AND p.arbitro_user_id = auth.uid() AND has_role(auth.uid(),'arbitro'::app_role)));
CREATE POLICY "Tribunal reads planilla items" ON public.planilla_arbitral_items FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'tribunal'::app_role));

-- L) goles_jugador
CREATE TABLE public.goles_jugador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id uuid NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  jugador_id uuid NOT NULL REFERENCES public.jugadores(id),
  equipo_id uuid NOT NULL REFERENCES public.equipos(id),
  cantidad integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.goles_jugador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read goles" ON public.goles_jugador FOR SELECT USING (true);
CREATE POLICY "Admins manage goles" ON public.goles_jugador FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));
CREATE INDEX idx_goles_jugador ON public.goles_jugador(jugador_id);
CREATE INDEX idx_goles_partido ON public.goles_jugador(partido_id);

-- M) tabla_posiciones_snapshot
CREATE TABLE public.tabla_posiciones_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_categoria_id uuid NOT NULL REFERENCES public.torneo_categorias(id) ON DELETE CASCADE,
  zona_id uuid REFERENCES public.zonas(id) ON DELETE SET NULL,
  equipo_id uuid NOT NULL REFERENCES public.equipos(id),
  pj integer NOT NULL DEFAULT 0,
  pg integer NOT NULL DEFAULT 0,
  pe integer NOT NULL DEFAULT 0,
  pp integer NOT NULL DEFAULT 0,
  gf integer NOT NULL DEFAULT 0,
  gc integer NOT NULL DEFAULT 0,
  dg integer NOT NULL DEFAULT 0,
  pts integer NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('zona','general','final')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tabla_posiciones_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read snapshots" ON public.tabla_posiciones_snapshot FOR SELECT USING (true);
CREATE POLICY "Admins manage snapshots" ON public.tabla_posiciones_snapshot FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));

-- N) historico_torneos
CREATE TABLE public.historico_torneos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id uuid NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.categorias(id),
  campeon_equipo_id uuid REFERENCES public.equipos(id),
  subcampeon_equipo_id uuid REFERENCES public.equipos(id),
  goleador_jugador_id uuid REFERENCES public.jugadores(id),
  datos_finales jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(torneo_id, categoria_id)
);
ALTER TABLE public.historico_torneos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read historico" ON public.historico_torneos FOR SELECT USING (true);
CREATE POLICY "Admins manage historico" ON public.historico_torneos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin_general'::app_role) OR has_role(auth.uid(),'admin_comun'::app_role));
