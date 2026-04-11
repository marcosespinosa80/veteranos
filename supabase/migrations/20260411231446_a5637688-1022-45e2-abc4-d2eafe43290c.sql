
-- Tabla tarifas
CREATE TABLE public.tarifas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  monto numeric NOT NULL,
  estado text NOT NULL DEFAULT 'activa',
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date NULL,
  temporada integer NOT NULL DEFAULT 2026,
  descripcion text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tarifas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tarifas" ON public.tarifas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_comun'));

CREATE POLICY "Authenticated can read tarifas" ON public.tarifas
  FOR SELECT TO authenticated
  USING (true);

-- Validation trigger for tarifas.estado
CREATE OR REPLACE FUNCTION public.validate_tarifa_estado()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tipo NOT IN ('inscripcion_jugador','inscripcion_equipo','cuota_mensual','pase','multa','arbitraje','otro') THEN
    RAISE EXCEPTION 'Tipo de tarifa inválido: %', NEW.tipo;
  END IF;
  IF NEW.estado NOT IN ('activa','inactiva') THEN
    RAISE EXCEPTION 'Estado de tarifa inválido: %', NEW.estado;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_tarifa_before_save
  BEFORE INSERT OR UPDATE ON public.tarifas
  FOR EACH ROW EXECUTE FUNCTION public.validate_tarifa_estado();

CREATE TRIGGER update_tarifas_updated_at
  BEFORE UPDATE ON public.tarifas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla cargos
CREATE TABLE public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarifa_id uuid REFERENCES public.tarifas(id) NULL,
  tipo text NOT NULL,
  monto numeric NOT NULL,
  estado_pago text NOT NULL DEFAULT 'pendiente',
  fecha_emision date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento date NULL,
  descripcion text NULL,
  jugador_id uuid REFERENCES public.jugadores(id) NULL,
  equipo_id uuid REFERENCES public.equipos(id) NULL,
  pase_id uuid REFERENCES public.pases(id) NULL,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cargos" ON public.cargos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_comun'));

CREATE POLICY "Authenticated can read cargos" ON public.cargos
  FOR SELECT TO authenticated
  USING (true);

-- Validation trigger for cargos
CREATE OR REPLACE FUNCTION public.validate_cargo_estado()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.estado_pago NOT IN ('pendiente','pagado','vencido') THEN
    RAISE EXCEPTION 'Estado de pago inválido: %', NEW.estado_pago;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_cargo_before_save
  BEFORE INSERT OR UPDATE ON public.cargos
  FOR EACH ROW EXECUTE FUNCTION public.validate_cargo_estado();

-- Tabla pagos
CREATE TABLE public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_pago timestamptz NOT NULL DEFAULT now(),
  monto_total numeric NOT NULL,
  medio_pago text NOT NULL,
  referencia text NULL,
  observaciones text NULL,
  registrado_por uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pagos" ON public.pagos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_comun'));

CREATE POLICY "Authenticated can read pagos" ON public.pagos
  FOR SELECT TO authenticated
  USING (true);

-- Validation trigger for pagos
CREATE OR REPLACE FUNCTION public.validate_pago_medio()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.medio_pago NOT IN ('efectivo','transferencia','otro') THEN
    RAISE EXCEPTION 'Medio de pago inválido: %', NEW.medio_pago;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_pago_before_save
  BEFORE INSERT OR UPDATE ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.validate_pago_medio();

-- Tabla pago_items
CREATE TABLE public.pago_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id uuid NOT NULL REFERENCES public.pagos(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id),
  monto_aplicado numeric NOT NULL
);

ALTER TABLE public.pago_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pago_items" ON public.pago_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_comun'));

CREATE POLICY "Authenticated can read pago_items" ON public.pago_items
  FOR SELECT TO authenticated
  USING (true);

-- Vista deuda por jugador
CREATE OR REPLACE VIEW public.deuda_jugador AS
SELECT
  c.jugador_id,
  j.apellido,
  j.nombre,
  j.dni,
  SUM(c.monto) AS total_cargos,
  COALESCE(SUM(pi_sum.total_pagado), 0) AS total_pagado,
  SUM(c.monto) - COALESCE(SUM(pi_sum.total_pagado), 0) AS deuda_pendiente,
  COUNT(c.id) AS cantidad_cargos
FROM public.cargos c
JOIN public.jugadores j ON j.id = c.jugador_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(pi.monto_aplicado), 0) AS total_pagado
  FROM public.pago_items pi WHERE pi.cargo_id = c.id
) pi_sum ON true
WHERE c.estado_pago IN ('pendiente','vencido')
  AND c.jugador_id IS NOT NULL
GROUP BY c.jugador_id, j.apellido, j.nombre, j.dni;

-- Vista deuda por equipo
CREATE OR REPLACE VIEW public.deuda_equipo AS
SELECT
  c.equipo_id,
  e.nombre_equipo,
  SUM(c.monto) AS total_cargos,
  COALESCE(SUM(pi_sum.total_pagado), 0) AS total_pagado,
  SUM(c.monto) - COALESCE(SUM(pi_sum.total_pagado), 0) AS deuda_pendiente,
  COUNT(c.id) AS cantidad_cargos
FROM public.cargos c
JOIN public.equipos e ON e.id = c.equipo_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(pi.monto_aplicado), 0) AS total_pagado
  FROM public.pago_items pi WHERE pi.cargo_id = c.id
) pi_sum ON true
WHERE c.estado_pago IN ('pendiente','vencido')
  AND c.equipo_id IS NOT NULL
GROUP BY c.equipo_id, e.nombre_equipo;
