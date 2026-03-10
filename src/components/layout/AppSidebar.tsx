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
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNavigationForRole, getRoleLabel, type UserRole } from '@/lib/navigation';
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
};

interface AppSidebarProps {
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
}

export function AppSidebar({ userRole, userName, onLogout }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navItems = getNavigationForRole(userRole);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <img src={logoLvfc} alt="LVFC" className="w-10 h-10 rounded object-contain bg-sidebar-accent" />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-display font-bold text-sidebar-primary truncate">LVFC</span>
            <span className="text-[10px] text-sidebar-foreground/60 truncate">Liga de Veteranos</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
              title={collapsed ? item.title : undefined}
            >
              {Icon && <Icon className="w-5 h-5 shrink-0" />}
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && (
          <div className="px-2 py-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-[10px] text-sidebar-foreground/50">{getRoleLabel(userRole)}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>
      </div>
    </aside>
  );
}
