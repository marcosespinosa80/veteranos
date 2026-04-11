
-- Create canchas table
CREATE TABLE public.canchas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  direccion text,
  club_asignado_id uuid REFERENCES public.equipos(id) ON DELETE SET NULL,
  google_maps_url text,
  estado text NOT NULL DEFAULT 'disponible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add check constraint for estado values
CREATE OR REPLACE FUNCTION public.validate_cancha_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado NOT IN ('disponible', 'mantenimiento', 'no_disponible') THEN
    RAISE EXCEPTION 'Estado inválido: %. Valores permitidos: disponible, mantenimiento, no_disponible', NEW.estado;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_cancha_estado
BEFORE INSERT OR UPDATE ON public.canchas
FOR EACH ROW EXECUTE FUNCTION public.validate_cancha_estado();

-- Auto-update updated_at
CREATE TRIGGER update_canchas_updated_at
BEFORE UPDATE ON public.canchas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.canchas ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can read
CREATE POLICY "Authenticated can read canchas"
ON public.canchas FOR SELECT TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: only admins
CREATE POLICY "Admins can manage canchas"
ON public.canchas FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin_general'::app_role) OR has_role(auth.uid(), 'admin_comun'::app_role));

-- Seed initial data
INSERT INTO public.canchas (nombre, estado) VALUES
  ('Complejo C.E.C (Cancha 2)', 'disponible'),
  ('Complejo (EL BOTA)', 'disponible'),
  ('Complejo C.E.C (Cancha 1)', 'disponible'),
  ('C.A.I. (Cancha 2)', 'disponible'),
  ('Complejo ANTAPOCA', 'disponible'),
  ('Complejo DOÑA ROSA', 'disponible'),
  ('Complejo ODONTÓLOGO', 'disponible'),
  ('Complejo POLICÍAS RETIRADOS', 'disponible'),
  ('Complejo NINO (Cancha 2)', 'disponible'),
  ('Complejo MÉDICO', 'disponible'),
  ('Club BANCO (cancha 2)', 'disponible'),
  ('Complejo DON SEGUNDO', 'disponible'),
  ('Complejo SOEN', 'disponible'),
  ('Club SALTA', 'disponible'),
  ('Club PIRQUITA', 'disponible'),
  ('Complejo Policía (Cancha 1)', 'disponible'),
  ('Complejo VIALIDAD', 'disponible'),
  ('C.A.I. (Cancha 1)', 'disponible'),
  ('Club SANTA CRUZ', 'disponible'),
  ('Club LA FALDA', 'disponible'),
  ('Club LA ESTACION', 'disponible'),
  ('Club LIBERAL', 'disponible'),
  ('Club CHACARITA', 'disponible'),
  ('Club SAN ISIDRO (Nueva Coneta)', 'disponible'),
  ('Complejo Policía (Cancha 2)', 'disponible'),
  ('Club VILLA CUBAS', 'disponible'),
  ('SIN CANCHA', 'no_disponible');
