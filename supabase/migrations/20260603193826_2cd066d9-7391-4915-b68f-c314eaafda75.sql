
REVOKE EXECUTE ON FUNCTION public.auto_desasignar_delegado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_es_delegado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_club_desactivacion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_items_lista_aprobada() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_update_lista_aprobada() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_jugador_exclusividad_categoria() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_jugador_lista_buena_fe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.avanzar_temporada() FROM PUBLIC, anon, authenticated;
