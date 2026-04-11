export type UserRole = 'admin_general' | 'admin_comun' | 'delegado' | 'arbitro' | 'tribunal';

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export const navigationItems: NavItem[] = [
  {
    title: 'Panel de Control',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin_general', 'admin_comun', 'delegado', 'arbitro', 'tribunal'],
  },
  {
    title: 'Jugadores',
    href: '/jugadores',
    icon: 'Users',
    roles: ['admin_general', 'admin_comun', 'delegado'],
  },
  {
    title: 'Clubes',
    href: '/equipos',
    icon: 'Shield',
    roles: ['admin_general', 'admin_comun', 'delegado'],
  },
  {
    title: 'Carnets',
    href: '/carnets',
    icon: 'CreditCard',
    roles: ['admin_general', 'admin_comun', 'arbitro'],
  },
  {
    title: 'Listas de Buena Fe',
    href: '/listas-buena-fe',
    icon: 'ClipboardList',
    roles: ['admin_general', 'admin_comun', 'delegado'],
  },
  {
    title: 'Pases',
    href: '/pases',
    icon: 'ArrowRightLeft',
    roles: ['admin_general', 'admin_comun', 'delegado'],
  },
  {
    title: 'Boletines (Admin)',
    href: '/admin/boletines',
    icon: 'FileText',
    roles: ['admin_general', 'admin_comun'],
  },
  {
    title: 'Canchas',
    href: '/canchas',
    icon: 'MapPin',
    roles: ['admin_general', 'admin_comun'],
  },
  {
    title: 'Usuarios',
    href: '/usuarios',
    icon: 'UserCog',
    roles: ['admin_general'],
  },
];

export function getNavigationForRole(role: UserRole): NavItem[] {
  return navigationItems.filter(item => item.roles.includes(role));
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin_general: 'Administrador General',
    admin_comun: 'Administrador',
    delegado: 'Delegado',
    arbitro: 'Árbitro',
    tribunal: 'Tribunal',
  };
  return labels[role];
}
