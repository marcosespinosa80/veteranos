/**
 * Cálculo de tabla de posiciones desde la lista de partidos.
 * - Ganador: 3 pts (sea por goles o por penales).
 * - Perdedor: 0 pts.
 * - Sin empate final.
 * - Solo cuenta partidos con estado en (jugado, cargado, confirmado).
 */
export interface Partido {
  id: string;
  zona_id: string | null;
  estado: string;
  equipo_local_id: string | null;
  equipo_visitante_id: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  ganador_id: string | null;
  hubo_penales: boolean;
}

export interface Equipo {
  id: string;
  nombre_equipo: string;
}

export interface FilaTabla {
  equipo_id: string;
  equipo: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

const VALIDOS = new Set(['jugado', 'cargado', 'confirmado']);

export function calcularTabla(equipos: Equipo[], partidos: Partido[]): FilaTabla[] {
  const map = new Map<string, FilaTabla>();
  for (const e of equipos) {
    map.set(e.id, { equipo_id: e.id, equipo: e.nombre_equipo, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 });
  }
  for (const p of partidos) {
    if (!VALIDOS.has(p.estado)) continue;
    if (!p.equipo_local_id || !p.equipo_visitante_id) continue;
    if (p.goles_local == null || p.goles_visitante == null) continue;

    const local = map.get(p.equipo_local_id);
    const visit = map.get(p.equipo_visitante_id);
    if (!local || !visit) continue;

    local.pj++; visit.pj++;
    local.gf += p.goles_local; local.gc += p.goles_visitante;
    visit.gf += p.goles_visitante; visit.gc += p.goles_local;

    let ganadorId = p.ganador_id;
    if (!ganadorId && p.goles_local !== p.goles_visitante) {
      ganadorId = p.goles_local > p.goles_visitante ? p.equipo_local_id : p.equipo_visitante_id;
    }
    if (ganadorId === p.equipo_local_id) { local.pg++; visit.pp++; local.pts += 3; }
    else if (ganadorId === p.equipo_visitante_id) { visit.pg++; local.pp++; visit.pts += 3; }
    // Sin empates finales: PE queda en 0.
  }
  for (const fila of map.values()) fila.dg = fila.gf - fila.gc;

  return Array.from(map.values()).sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.equipo.localeCompare(b.equipo)
  );
}
