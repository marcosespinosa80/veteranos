/**
 * Lógica de clasificación, fases finales (bracket) y posicionamiento.
 *
 * Reglas:
 * - Total de clasificados: 4 (semifinales), 8 (cuartos), 16 (octavos).
 * - Por defecto se toman los primeros N de cada zona; si quedan cupos se completan
 *   con los "mejores N°" (ej: mejores terceros) según ranking general.
 * - Bracket por siembra estándar: 1 vs último, 2 vs anteúltimo, etc.
 * - Cruces de posicionamiento: empareja no clasificados por orden general (1°vs2°, 3°vs4°...).
 */
import type { FilaTabla } from './posiciones';

export type FaseFinal = 'octavos' | 'cuartos' | 'semifinal' | 'final';

export interface ClasificacionConfig {
  clasificados_por_zona: number; // ej 2
  total_clasificados: 4 | 8 | 16;
}

export interface ZonaConTabla {
  zona_id: string;
  nombre: string;
  tabla: FilaTabla[]; // ya ordenada por puntos / DG / GF
}

export interface EquipoSembrado {
  equipo_id: string;
  nombre: string;
  zona_id: string;
  posicion_zona: number; // 1-based
  pts: number;
  dg: number;
  gf: number;
}

/**
 * Determina los clasificados y los no-clasificados respetando la config.
 * - Toma los primeros `clasificados_por_zona` de cada zona.
 * - Si faltan cupos para llegar a `total_clasificados`, completa con los siguientes
 *   mejores (siguiente posición de cada zona ordenados por pts/DG/GF).
 */
export function obtenerClasificados(
  zonas: ZonaConTabla[],
  config: ClasificacionConfig,
): { clasificados: EquipoSembrado[]; noClasificados: EquipoSembrado[] } {
  const todos: EquipoSembrado[] = [];
  zonas.forEach((z) => {
    z.tabla.forEach((f, idx) => {
      todos.push({
        equipo_id: f.equipo_id,
        nombre: f.equipo,
        zona_id: z.zona_id,
        posicion_zona: idx + 1,
        pts: f.pts,
        dg: f.dg,
        gf: f.gf,
      });
    });
  });

  const directos: EquipoSembrado[] = [];
  const restantes: EquipoSembrado[] = [];
  todos.forEach((e) => {
    if (e.posicion_zona <= config.clasificados_por_zona) directos.push(e);
    else restantes.push(e);
  });

  // ordenar restantes por pts/DG/GF para "mejores siguientes"
  restantes.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.nombre.localeCompare(b.nombre));

  const faltan = Math.max(0, config.total_clasificados - directos.length);
  const repechaje = restantes.slice(0, faltan);
  const noClas = restantes.slice(faltan);

  // ranking final de clasificados por pts/DG/GF para sembrar
  const clasificados = [...directos, ...repechaje].sort(
    (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.nombre.localeCompare(b.nombre),
  );

  return { clasificados, noClasificados: noClas };
}

/**
 * Genera los cruces iniciales del bracket (1 vs N, 2 vs N-1, ...).
 * Devuelve la fase inicial y los cruces.
 */
export function generarBracket(
  clasificados: EquipoSembrado[],
): { fase: FaseFinal; cruces: { local: EquipoSembrado; visitante: EquipoSembrado }[] } {
  const n = clasificados.length;
  let fase: FaseFinal;
  if (n === 16) fase = 'octavos';
  else if (n === 8) fase = 'cuartos';
  else if (n === 4) fase = 'semifinal';
  else if (n === 2) fase = 'final';
  else throw new Error(`Cantidad de clasificados no soportada: ${n} (debe ser 2, 4, 8 o 16)`);

  const cruces: { local: EquipoSembrado; visitante: EquipoSembrado }[] = [];
  for (let i = 0; i < n / 2; i++) {
    cruces.push({ local: clasificados[i], visitante: clasificados[n - 1 - i] });
  }
  return { fase, cruces };
}

/**
 * Empareja no clasificados para definir posiciones (5°vs6°, 7°vs8°, etc.).
 * Asume `noClasificados` ya ordenados por mérito (pts/DG/GF).
 */
export function generarPosicionamiento(
  noClasificados: EquipoSembrado[],
): { local: EquipoSembrado; visitante: EquipoSembrado; etiqueta: string }[] {
  const cruces: { local: EquipoSembrado; visitante: EquipoSembrado; etiqueta: string }[] = [];
  // El primer no-clasificado define posición = total_clasificados + 1
  // Etiquetamos por par.
  for (let i = 0; i + 1 < noClasificados.length; i += 2) {
    const a = noClasificados[i];
    const b = noClasificados[i + 1];
    cruces.push({ local: a, visitante: b, etiqueta: `Definición posiciones` });
  }
  return cruces;
}

export const FASE_LABEL: Record<FaseFinal, string> = {
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinales',
  final: 'Final',
};
