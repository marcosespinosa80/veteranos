// Helpers para bloquear acciones según estado de un torneo.
// configuracion: todo permitido
// en_curso: bloquea cambios estructurales, permite operativos (resultados, planillas, reprogramaciones)
// finalizado / archivado: solo lectura

export type TorneoEstado = 'configuracion' | 'en_curso' | 'finalizado' | 'archivado' | string | null | undefined;

export function isEstructuralBloqueado(estado: TorneoEstado): boolean {
  return estado === 'en_curso' || estado === 'finalizado' || estado === 'archivado';
}

export function isSoloLectura(estado: TorneoEstado): boolean {
  return estado === 'finalizado' || estado === 'archivado';
}

export function mensajeBloqueoEstructural(estado: TorneoEstado): string {
  if (estado === 'finalizado') return 'El torneo está finalizado: solo lectura.';
  if (estado === 'archivado') return 'El torneo está archivado: solo lectura.';
  if (estado === 'en_curso') return 'El torneo está en curso: no se pueden modificar categorías, equipos, zonas ni fixture.';
  return 'Acción no permitida en el estado actual del torneo.';
}

export function bannerTorneoEstado(estado: TorneoEstado): { tipo: 'warn' | 'info' | null; texto: string } {
  if (estado === 'en_curso') return { tipo: 'warn', texto: 'TORNEO EN CURSO: no se pueden modificar categorías, equipos, zonas ni fixture. Solo carga de resultados, planillas y reprogramaciones.' };
  if (estado === 'finalizado') return { tipo: 'info', texto: 'TORNEO FINALIZADO: solo lectura. No se puede modificar ni eliminar información.' };
  if (estado === 'archivado') return { tipo: 'info', texto: 'TORNEO ARCHIVADO: solo lectura.' };
  return { tipo: null, texto: '' };
}
