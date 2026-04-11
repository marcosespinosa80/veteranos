import { Link, useLocation } from 'react-router-dom';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
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
      { label: 'Gestión Financiera', href: '/finanzas', moduleKey: 'finanzas' },
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
      { label: 'Canchas', href: '/canchas', moduleKey: 'canchas' },
    ],
  },
];

export function TopMenu() {
  const location = useLocation();
  const { hasModule } = usePermissions();
  const { role } = useAuth();

  const isAdminRole = role === 'admin_general' || role === 'admin_comun';

  const canAccessItem = (item: MenuItem): boolean => {
    if (item.placeholder) return isAdminRole;
    if (item.moduleKey) return hasModule(item.moduleKey);
    return true;
  };

  const isGroupActive = (group: MenuGroup): boolean =>
    group.items.some((item) => location.pathname === item.href);

  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessItem(item)),
    }))
    .filter((group) => group.items.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <Menubar className="h-auto space-x-0 rounded-none border-0 bg-transparent p-0">
      {visibleGroups.map((group) => (
        <MenubarMenu key={group.title}>
          <MenubarTrigger
            className={cn(
              'cursor-pointer rounded-sm px-4 py-1.5 text-xs font-semibold tracking-wider',
              'text-muted-foreground hover:bg-accent hover:text-foreground',
              'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
              isGroupActive(group) && 'bg-accent text-primary'
            )}
          >
            {group.title}
          </MenubarTrigger>

          <MenubarContent align="start" sideOffset={4} className="min-w-[180px]">
            {group.items.map((item, idx) => (
              <div key={item.href}>
                {idx > 0 && <MenubarSeparator />}

                {item.placeholder ? (
                  <MenubarItem disabled className="text-sm">
                    {item.label}
                    <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
                  </MenubarItem>
                ) : (
                  <MenubarItem
                    asChild
                    className={cn(
                      'cursor-pointer text-sm',
                      location.pathname === item.href && 'bg-accent font-semibold'
                    )}
                  >
                    <Link to={item.href}>{item.label}</Link>
                  </MenubarItem>
                )}
              </div>
            ))}
          </MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  );
}
