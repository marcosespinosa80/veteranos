import type { UserRole } from './navigation';

export const MODULE_KEYS = [
  'dashboard',
  'jugadores',
  'equipos',
  'carnets',
  'listas_buena_fe',
  'pases',
  'boletines_admin',
  'usuarios',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Panel de Control',
  jugadores: 'Jugadores',
  equipos: 'Equipos',
  carnets: 'Carnets',
  listas_buena_fe: 'Listas de Buena Fe',
  pases: 'Pases',
  boletines_admin: 'Boletines (Admin)',
  usuarios: 'Usuarios',
};

// Map route paths to module keys
export const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  '/dashboard': 'dashboard',
  '/jugadores': 'jugadores',
  '/equipos': 'equipos',
  '/carnets': 'carnets',
  '/listas-buena-fe': 'listas_buena_fe',
  '/pases': 'pases',
  '/admin/boletines': 'boletines_admin',
  '/usuarios': 'usuarios',
};

export function getDefaultModules(role: UserRole): Record<ModuleKey, boolean> {
  const all = Object.fromEntries(MODULE_KEYS.map((k) => [k, false])) as Record<ModuleKey, boolean>;

  switch (role) {
    case 'admin_general':
      MODULE_KEYS.forEach((k) => (all[k] = true));
      break;
    case 'admin_comun':
      all.dashboard = true;
      all.jugadores = true;
      all.equipos = true;
      all.listas_buena_fe = true;
      all.pases = true;
      all.carnets = true;
      all.boletines_admin = true;
      break;
    case 'delegado':
      all.dashboard = true;
      all.jugadores = true;
      all.equipos = true;
      all.listas_buena_fe = true;
      all.pases = true;
      break;
    case 'arbitro':
      all.dashboard = true;
      all.carnets = true;
      break;
    case 'tribunal':
      all.dashboard = true;
      break;
  }

  return all;
}
