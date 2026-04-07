import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
} from '@/components/ui/menubar';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import type { ModuleKey } from '@/lib/modules';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  href: string;
  moduleKey?: ModuleKey;
  placeholder?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'CONFIGURACIÓN',
    items: [
      { label: 'Usuarios', href: '/usuarios', moduleKey: 'usuarios' },
      { label: 'Tarifas', href: '/tarifas', placeholder: true },
      { label: 'Categorías', href: '/categorias', placeholder: true },
    ],
  },
  {
    title: 'COMPETICIÓN',
    items: [
      { label: 'Partidos', href: '/partidos', placeholder: true },
      { label: 'Fixture', href: '/fixture', placeholder: true },
      { label: 'Tabla', href: '/tabla', placeholder: true },
    ],
  },
  {
    title: 'GESTIÓN',
    items: [
      { label: 'Jugadores', href: '/jugadores', moduleKey: 'jugadores' },
      { label: 'Pases', href: '/pases', moduleKey: 'pases' },
      { label: 'Clubes', href: '/equipos', moduleKey: 'equipos' },
      { label: 'Canchas', href: '/canchas', placeholder: true },
    ],
  },
];

export function TopMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasModule } = usePermissions();
  const { role } = useAuth();

  const isAdminRole = role === 'admin_general' || role === 'admin_comun';

  const canAccessItem = (item: MenuItem): boolean => {
    // Placeholder pages: only admins
    if (item.placeholder) return isAdminRole;
    // Module-based check
    if (item.moduleKey) return hasModule(item.moduleKey);
    return true;
  };

  const isGroupActive = (group: MenuGroup): boolean => {
    return group.items.some((item) => location.pathname === item.href);
  };

  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessItem(item)),
    }))
    .filter((group) => group.items.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <Menubar className="border-0 bg-transparent p-0 h-auto space-x-0 rounded-none">
      {visibleGroups.map((group) => (
        <MenubarMenu key={group.title}>
          <MenubarTrigger
            className={cn(
              'px-4 py-1.5 text-xs font-semibold tracking-wider cursor-pointer rounded-sm',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
              isGroupActive(group) && 'text-primary bg-accent'
            )}
          >
            {group.title}
          </MenubarTrigger>
          <MenubarContent align="start" sideOffset={4} className="min-w-[180px]">
            {group.items.map((item, idx) => (
              <div key={item.href}>
                {idx > 0 && <MenubarSeparator />}
                <MenubarItem
                  disabled={item.placeholder}
                  className={cn(
                    'cursor-pointer text-sm',
                    location.pathname === item.href && 'bg-accent font-semibold'
                  )}
                  onClick={() => {
                    if (!item.placeholder) navigate(item.href);
                  }}
                >
                  {item.label}
                  {item.placeholder && (
                    <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
                  )}
                </MenubarItem>
              </div>
            ))}
          </MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  );
}
