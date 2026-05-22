import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
  CreditCard,
  ClipboardList,
  ArrowRightLeft,
  FileText,
  UserCog,
  MapPin,
  DollarSign,
  Trophy,
  ChevronLeft,
  LogOut,
  Gavel,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleLabel, type UserRole } from '@/lib/navigation';
import { ROUTE_MODULE_MAP, type ModuleKey } from '@/lib/modules';
import { usePermissions } from '@/hooks/usePermissions';
import logoLvfc from '@/assets/logo-lvfc.png';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Shield,
  CreditCard,
  ClipboardList,
  ArrowRightLeft,
  FileText,
  UserCog,
  MapPin,
  DollarSign,
  Trophy,
  Gavel,
};

interface NavItem {
  title: string;
  href: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'PRINCIPAL',
    items: [{ title: 'Panel de Control', href: '/dashboard', icon: 'LayoutDashboard' }],
  },
  {
    title: 'GESTIÓN DE PERSONAS',
    items: [
      { title: 'Jugadores', href: '/jugadores', icon: 'Users' },
      { title: 'Usuarios', href: '/usuarios', icon: 'UserCog' },
      { title: 'Carnets', href: '/carnets', icon: 'CreditCard' },
    ],
  },
  {
    title: 'CLUBES Y REGISTROS',
    items: [
      { title: 'Clubes', href: '/equipos', icon: 'Shield' },
      { title: 'Canchas', href: '/canchas', icon: 'MapPin' },
      { title: 'Listas de Buena Fe', href: '/listas-buena-fe', icon: 'ClipboardList' },
      { title: 'Pases', href: '/pases', icon: 'ArrowRightLeft' },
    ],
  },
  {
    title: 'FINANZAS',
    items: [{ title: 'Gestión Financiera', href: '/finanzas', icon: 'DollarSign' }],
  },
  {
    title: 'TORNEOS',
    items: [{ title: 'Torneos', href: '/admin/torneos', icon: 'Trophy' }],
  },
  {
    title: 'COMUNICACIÓN',
    items: [{ title: 'Boletines', href: '/admin/boletines', icon: 'FileText' }],
  },
  {
    title: 'TRIBUNAL',
    items: [{ title: 'Multas', href: '/tribunal/multas', icon: 'Gavel' }],
  },
];

interface AppSidebarProps {
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

export function AppSidebar({ userRole, userName, onLogout }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { hasModule } = usePermissions();

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const moduleKey = ROUTE_MODULE_MAP[item.href] as ModuleKey | undefined;
      if (!moduleKey) return true;
      return hasModule(moduleKey);
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <img
          src={logoLvfc}
          alt="LVFC"
          className="w-10 h-10 rounded-md object-contain bg-sidebar-accent shrink-0"
        />
        {!collapsed && (
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-base font-display font-extrabold text-sidebar-primary tracking-wide">
              LVFC
            </span>
            <span className="text-[10px] text-sidebar-foreground/70 truncate">Liga de Veteranos</span>
            <span className="text-[10px] text-sidebar-foreground/50 truncate">de Fútbol de Catamarca</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-sidebar-foreground/40">
                {group.title}
              </p>
            )}
            {collapsed && <div className="mx-3 my-2 h-px bg-sidebar-border/60" />}
            {group.items.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive =
                location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-sidebar-primary" />
                  )}
                  {Icon && <Icon className="w-[18px] h-[18px] shrink-0" />}
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-3">
        {/* 1. Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors w-full"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <ChevronLeft className={cn('w-4 h-4 shrink-0 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Colapsar menú</span>}
        </button>

        <div className="h-px bg-sidebar-border/70" />

        {/* 2. User card */}
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-sidebar-accent/40">
            <div className="w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {getInitials(userName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{userName}</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{getRoleLabel(userRole)}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold">
              {getInitials(userName)}
            </div>
          </div>
        )}

        <div className="h-px bg-sidebar-border/70" />

        {/* 3. Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
