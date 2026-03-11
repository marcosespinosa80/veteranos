
-- Create triggers for auto_asignar_categoria and update_updated_at
CREATE TRIGGER trg_auto_categoria
  BEFORE INSERT OR UPDATE OF fecha_nacimiento ON public.jugadores
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_asignar_categoria();

CREATE TRIGGER trg_updated_at_jugadores
  BEFORE UPDATE ON public.jugadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_equipos
  BEFORE UPDATE ON public.equipos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_listas
  BEFORE UPDATE ON public.listas_buena_fe
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_pases
  BEFORE UPDATE ON public.pases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
