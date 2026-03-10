
-- ==========================================
-- FASE 2: Esquema completo LVFC
-- ==========================================

-- 1. Enum types
CREATE TYPE public.app_role AS ENUM ('admin_general', 'admin_comun', 'delegado', 'arbitro', 'tribunal');
CREATE TYPE public.estado_equipo AS ENUM ('activo', 'inactivo');
CREATE TYPE public.estado_jugador AS ENUM ('habilitado', 'no_habilitado', 'expulsado');
CREATE TYPE public.estado_certificado AS ENUM ('vigente', 'vencido', 'anulado');
CREATE TYPE public.estado_lista AS ENUM ('borrador', 'enviada', 'observada', 'aprobada', 'rechazada');
CREATE TYPE public.estado_item_lista AS ENUM ('incluido', 'baja');
CREATE TYPE public.estado_carnet AS ENUM ('activo', 'inactivo');
CREATE TYPE public.estado_pase AS ENUM ('iniciado', 'pendiente_firmas', 'revision_liga', 'observado', 'rechazado', 'aprobado', 'pendiente_pago', 'habilitado');

-- 2. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  email TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  equipo_id UUID, -- FK added after equipos table
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Helper: get user's equipo_id
CREATE OR REPLACE FUNCTION public.get_user_equipo_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT equipo_id FROM public.profiles
  WHERE id = _user_id
$$;

-- 5. Categorias table
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_categoria TEXT NOT NULL UNIQUE
);

-- Insert default categories
INSERT INTO public.categorias (nombre_categoria) VALUES
  ('Única'),
  ('Maxi'),
  ('Super Maxi'),
  ('Senior'),
  ('Super Senior'),
  ('Master'),
  ('Super Master'),
  ('Graduados');

-- 6. Category rules 2026 (year of birth → category mapping)
CREATE TABLE public.categoria_reglas_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.categorias(id),
  anio_nacimiento_desde INT NOT NULL,
  anio_nacimiento_hasta INT NOT NULL
);

-- Insert 2026 rules (approximate ranges based on veteran football conventions)
-- Única: 1986-1991 (35-40 años en 2026)
-- Maxi: 1981-1985 (41-45)
-- Super Maxi: 1976-1980 (46-50)
-- Senior: 1971-1975 (51-55)
-- Super Senior: 1966-1970 (56-60)
-- Master: 1961-1965 (61-65)
-- Super Master: 1956-1960 (66-70)
-- Graduados: 1955 y anteriores (71+)
INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT c.id, r.desde, r.hasta
FROM (VALUES
  ('Única', 1986, 1991),
  ('Maxi', 1981, 1985),
  ('Super Maxi', 1976, 1980),
  ('Senior', 1971, 1975),
  ('Super Senior', 1966, 1970),
  ('Master', 1961, 1965),
  ('Super Master', 1956, 1960),
  ('Graduados', 1900, 1955)
) AS r(cat, desde, hasta)
JOIN public.categorias c ON c.nombre_categoria = r.cat;

-- 7. Equipos table
CREATE TABLE public.equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_equipo TEXT NOT NULL UNIQUE,
  cancha TEXT,
  delegado_1 UUID REFERENCES public.profiles(id),
  delegado_2 UUID REFERENCES public.profiles(id),
  estado estado_equipo NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now add FK from profiles to equipos
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);

-- 8. Equipo-Categoria relationship
CREATE TABLE public.equipo_categoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id UUID NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id),
  temporada INT NOT NULL DEFAULT 2026,
  UNIQUE(equipo_id, categoria_id, temporada)
);

-- 9. Jugadores table
CREATE TABLE public.jugadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni TEXT NOT NULL UNIQUE,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  telefono TEXT,
  direccion TEXT,
  foto_url TEXT,
  equipo_id UUID REFERENCES public.equipos(id),
  categoria_id UUID REFERENCES public.categorias(id),
  estado estado_jugador NOT NULL DEFAULT 'no_habilitado',
  apto_medico BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Certificados medicos
CREATE TABLE public.certificados_medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  archivo_url TEXT,
  estado estado_certificado NOT NULL DEFAULT 'vigente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Listas de buena fe
CREATE TABLE public.listas_buena_fe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id UUID NOT NULL REFERENCES public.equipos(id),
  categoria_id UUID NOT NULL REFERENCES public.categorias(id),
  temporada INT NOT NULL DEFAULT 2026,
  estado estado_lista NOT NULL DEFAULT 'borrador',
  fecha_envio TIMESTAMPTZ,
  fecha_aprobacion TIMESTAMPTZ,
  creada_por UUID NOT NULL REFERENCES public.profiles(id),
  aprobada_por UUID REFERENCES public.profiles(id),
  firmada BOOLEAN NOT NULL DEFAULT false,
  fecha_firma DATE,
  cerrada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Items de lista de buena fe
CREATE TABLE public.lista_buena_fe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas_buena_fe(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES public.jugadores(id),
  estado_item estado_item_lista NOT NULL DEFAULT 'incluido'
);

-- 13. Carnets
CREATE TABLE public.carnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES public.jugadores(id) UNIQUE,
  codigo TEXT NOT NULL UNIQUE,
  qr_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE NOT NULL,
  estado estado_carnet NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Pases
CREATE TABLE public.pases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES public.jugadores(id),
  club_origen_id UUID NOT NULL REFERENCES public.equipos(id),
  club_destino_id UUID NOT NULL REFERENCES public.equipos(id),
  categoria_id UUID REFERENCES public.categorias(id),
  estado estado_pase NOT NULL DEFAULT 'iniciado',
  archivo_formulario_url TEXT,
  monto NUMERIC,
  pago_registrado BOOLEAN NOT NULL DEFAULT false,
  recibo_url TEXT,
  iniciado_por UUID NOT NULL REFERENCES public.profiles(id),
  revisado_por UUID REFERENCES public.profiles(id),
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_aprobacion TIMESTAMPTZ,
  fecha_habilitacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Boletines publicos
CREATE TABLE public.boletines_publicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.categorias(id),
  temporada INT NOT NULL DEFAULT 2026,
  fecha_publicacion DATE NOT NULL DEFAULT CURRENT_DATE,
  titulo TEXT NOT NULL,
  archivo_url TEXT,
  creado_por UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria_reglas_2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipo_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_buena_fe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_buena_fe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletines_publicos ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_general'));
CREATE POLICY "Admin general can manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general'));

-- USER_ROLES
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_general'));
CREATE POLICY "Admin general manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general'));

-- CATEGORIAS (read-only for all authenticated)
CREATE POLICY "Authenticated can read categorias" ON public.categorias FOR SELECT TO authenticated USING (true);

-- CATEGORIA_REGLAS_2026 (read-only for all authenticated)
CREATE POLICY "Authenticated can read reglas" ON public.categoria_reglas_2026 FOR SELECT TO authenticated USING (true);

-- EQUIPOS
CREATE POLICY "Authenticated can read equipos" ON public.equipos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage equipos" ON public.equipos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));

-- EQUIPO_CATEGORIA
CREATE POLICY "Authenticated can read equipo_categoria" ON public.equipo_categoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage equipo_categoria" ON public.equipo_categoria FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));

-- JUGADORES
CREATE POLICY "Admins can manage all jugadores" ON public.jugadores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));
CREATE POLICY "Delegados can read own team jugadores" ON public.jugadores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'delegado') AND equipo_id = public.get_user_equipo_id(auth.uid()));
CREATE POLICY "Delegados can insert own team jugadores" ON public.jugadores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'delegado') AND equipo_id = public.get_user_equipo_id(auth.uid()));
CREATE POLICY "Delegados can update own team jugadores" ON public.jugadores FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'delegado') AND equipo_id = public.get_user_equipo_id(auth.uid()));

-- CERTIFICADOS_MEDICOS
CREATE POLICY "Admins can manage certificados" ON public.certificados_medicos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));
CREATE POLICY "Delegados can read own team certificados" ON public.certificados_medicos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'delegado') AND EXISTS (
    SELECT 1 FROM public.jugadores j WHERE j.id = jugador_id AND j.equipo_id = public.get_user_equipo_id(auth.uid())
  ));

-- LISTAS_BUENA_FE
CREATE POLICY "Admins can manage listas" ON public.listas_buena_fe FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));
CREATE POLICY "Delegados can manage own team listas" ON public.listas_buena_fe FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'delegado') AND equipo_id = public.get_user_equipo_id(auth.uid()));

-- LISTA_BUENA_FE_ITEMS
CREATE POLICY "Admins can manage lista items" ON public.lista_buena_fe_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));
CREATE POLICY "Delegados can manage own team lista items" ON public.lista_buena_fe_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'delegado') AND EXISTS (
    SELECT 1 FROM public.listas_buena_fe l WHERE l.id = lista_id AND l.equipo_id = public.get_user_equipo_id(auth.uid())
  ));

-- CARNETS
CREATE POLICY "Admins can manage carnets" ON public.carnets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));
CREATE POLICY "Arbitros can read carnets" ON public.carnets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'arbitro'));

-- PASES
CREATE POLICY "Admins can manage pases" ON public.pases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));
CREATE POLICY "Delegados can read own team pases" ON public.pases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'delegado') AND (
    club_origen_id = public.get_user_equipo_id(auth.uid()) OR club_destino_id = public.get_user_equipo_id(auth.uid())
  ));
CREATE POLICY "Delegados can insert pases for destino" ON public.pases FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'delegado') AND club_destino_id = public.get_user_equipo_id(auth.uid()));

-- BOLETINES_PUBLICOS
CREATE POLICY "Anyone can read boletines" ON public.boletines_publicos FOR SELECT USING (true);
CREATE POLICY "Admins can manage boletines" ON public.boletines_publicos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_general') OR public.has_role(auth.uid(), 'admin_comun'));

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipos_updated_at BEFORE UPDATE ON public.equipos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jugadores_updated_at BEFORE UPDATE ON public.jugadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_listas_updated_at BEFORE UPDATE ON public.listas_buena_fe FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pases_updated_at BEFORE UPDATE ON public.pases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-calculate category from birth year
CREATE OR REPLACE FUNCTION public.calcular_categoria(p_fecha_nacimiento DATE)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT r.categoria_id
  FROM public.categoria_reglas_2026 r
  WHERE EXTRACT(YEAR FROM p_fecha_nacimiento)::INT BETWEEN r.anio_nacimiento_desde AND r.anio_nacimiento_hasta
  LIMIT 1
$$;

-- Auto-assign category on jugador insert/update
CREATE OR REPLACE FUNCTION public.auto_asignar_categoria()
RETURNS TRIGGER AS $$
BEGIN
  NEW.categoria_id := public.calcular_categoria(NEW.fecha_nacimiento);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_categoria_jugador
  BEFORE INSERT OR UPDATE OF fecha_nacimiento ON public.jugadores
  FOR EACH ROW EXECUTE FUNCTION public.auto_asignar_categoria();

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos-jugadores', 'fotos-jugadores', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('certificados-medicos', 'certificados-medicos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('formularios-pases', 'formularios-pases', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('recibos-pases', 'recibos-pases', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('boletines', 'boletines', true);

-- Storage policies
CREATE POLICY "Public read fotos jugadores" ON storage.objects FOR SELECT USING (bucket_id = 'fotos-jugadores');
CREATE POLICY "Auth upload fotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos-jugadores');
CREATE POLICY "Auth update fotos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'fotos-jugadores');

CREATE POLICY "Auth read certificados" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'certificados-medicos');
CREATE POLICY "Auth upload certificados" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificados-medicos');

CREATE POLICY "Auth read formularios pases" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'formularios-pases');
CREATE POLICY "Auth upload formularios pases" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'formularios-pases');

CREATE POLICY "Auth read recibos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'recibos-pases');
CREATE POLICY "Auth upload recibos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recibos-pases');

CREATE POLICY "Public read boletines" ON storage.objects FOR SELECT USING (bucket_id = 'boletines');
CREATE POLICY "Auth upload boletines" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'boletines');
