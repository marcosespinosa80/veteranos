// Helpers de DNI argentino: formato con puntos (ej: 25.123.123)

export function dniDigits(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '').slice(0, 8);
}

/**
 * Formatea un DNI con puntos al estilo argentino mientras el usuario escribe.
 * Acepta entradas con o sin puntos. Permite formatos parciales (no bloquea la escritura).
 *  - 8 dígitos => 12.345.678
 *  - 7 dígitos => 1.234.567
 *  - 4–6 dígitos => 1.234 / 12.345 / 123.456
 *  - <=3 dígitos => tal cual
 */
export function formatDni(value: string | null | undefined): string {
  const digits = dniDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, -3)}.${digits.slice(-3)}`;
  return `${digits.slice(0, -6)}.${digits.slice(-6, -3)}.${digits.slice(-3)}`;
}

/** DNI válido: 7 u 8 dígitos reales */
export function isValidDni(value: string | null | undefined): boolean {
  const len = dniDigits(value).length;
  return len === 7 || len === 8;
}
