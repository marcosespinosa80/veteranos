/**
 * Distribuye N equipos en zonas equilibradas respetando min/max.
 * Devuelve un array con cantidad de equipos por zona.
 * Ej: 29 equipos, min 7, max 10 -> [10, 10, 9]
 */
export function calcularDistribucionZonas(
  total: number,
  min = 7,
  max = 10
): { ok: boolean; zonas: number[]; mensaje?: string } {
  if (total <= 0) return { ok: false, zonas: [], mensaje: 'Sin equipos' };
  if (total <= max) return { ok: total >= min, zonas: [total], mensaje: total < min ? `Mínimo ${min} equipos` : undefined };

  // Try increasing number of zonas until valid
  for (let n = Math.ceil(total / max); n <= Math.floor(total / min); n++) {
    const base = Math.floor(total / n);
    const resto = total % n;
    if (base < min || base + (resto > 0 ? 1 : 0) > max) continue;
    const zonas: number[] = [];
    for (let i = 0; i < n; i++) zonas.push(base + (i < resto ? 1 : 0));
    return { ok: true, zonas };
  }
  return { ok: false, zonas: [], mensaje: `No se puede dividir ${total} equipos respetando ${min}-${max} por zona` };
}

/**
 * Reparte los equipos en zonas de forma secuencial respetando cantidades.
 * Ej: 26 equipos con [9,9,8] -> primeros 9 a Zona A, siguientes 9 a Zona B, últimos 8 a Zona C.
 */
export function repartirEquiposEnZonas<T>(equipos: T[], cantidades: number[]): T[][] {
  const zonas: T[][] = [];
  let cursor = 0;
  for (const cant of cantidades) {
    zonas.push(equipos.slice(cursor, cursor + cant));
    cursor += cant;
  }
  return zonas;
}

/**
 * Round-robin (algoritmo del círculo). Si la cantidad es impar, agrega "BYE".
 * Devuelve fechas: cada fecha es array de partidos {local, visitante} (o {libre} si BYE).
 */
export type Match<T> = { local: T | null; visitante: T | null; libre?: T | null };
export function generarFixtureRoundRobin<T>(equipos: T[]): Match<T>[][] {
  const eqs: (T | null)[] = [...equipos];
  if (eqs.length % 2 === 1) eqs.push(null); // BYE
  const n = eqs.length;
  const fechas: Match<T>[][] = [];
  const arr = [...eqs];

  for (let r = 0; r < n - 1; r++) {
    const fecha: Match<T>[] = [];
    let libre: T | null | undefined = undefined;
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === null) libre = b ?? null;
      else if (b === null) libre = a ?? null;
      else {
        // alterna localía
        if (i % 2 === 0 && r % 2 === 0) fecha.push({ local: a, visitante: b });
        else fecha.push({ local: b, visitante: a });
      }
    }
    if (libre !== undefined) (fecha as any).libre = libre;
    fechas.push(fecha);
    // rotate (keep first fixed)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return fechas;
}
