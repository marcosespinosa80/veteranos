import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { supabase } from '@/integrations/supabase/client';
import type { ModuleKey } from '@/lib/modules';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  href: string;
  moduleKey?: ModuleKey;
  placeholder?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

function useTorneoLinks() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Detect current torneo context from URL: /admin/torneos/:id
  const m = location.pathname.match(/^\/admin\/torneos\/([0-9a-f-]+)/i);
  const currentTorneoId = m?.[1];
  const currentCat = searchParams.get('cat') || '';

  // Fetch active/in-config torneo if no current context
  const { data: activeTorneo } = useQuery({
    queryKey: ['top-menu-active-torneo', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('torneos')
        .select('id, estado, created_at')
        .in('estado', ['en_curso', 'en_configuracion'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !loading && !!user,
  });

  const targetTorneoId = currentTorneoId || activeTorneo?.id || null;

  const { data: firstCat } = useQuery({
    queryKey: ['top-menu-first-cat', targetTorneoId, user?.id],
    queryFn: async () => {
      if (!targetTorneoId) return null;
      const { data } = await supabase
        .from('torneo_categorias')
        .select('id')
        .eq('torneo_id', targetTorneoId)
        .limit(1)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !loading && !!user && !!targetTorneoId,
  });

  const catId = currentCat || firstCat || '';

  const buildHref = (tab: 'fixture' | 'posiciones') => {
    if (!targetTorneoId) return null;
    const qs = new URLSearchParams();
    if (catId) qs.set('cat', catId);
    qs.set('tab', tab);
    return `/admin/torneos/${targetTorneoId}?${qs.toString()}`;
  };

  return {
    fixtureHref: buildHref('fixture'),
    tablaHref: buildHref('posiciones'),
    hasActive: !!targetTorneoId,
  };
}

export function TopMenu() {
  const location = useLocation();
  const { hasModule } = usePermissions();
  const { role } = useAuth();
  const { fixtureHref, tablaHref, hasActive } = useTorneoLinks();

  const isAdminRole = role === 'admin_general' || role === 'admin_comun';

  const menuGroups: MenuGroup[] = [
    {
      title: 'CONFIGURACIÓN',
      items: [
        { label: 'Usuarios', href: '/usuarios', moduleKey: 'usuarios' },
        { label: 'Gestión Financiera', href: '/finanzas', moduleKey: 'finanzas' },
      ],
    },
    {
      title: 'COMPETICIÓN',
      items: [
        { label: 'Torneos', href: '/admin/torneos', moduleKey: 'torneos' },
        {
          label: 'Fixture',
          href: fixtureHref || '/admin/torneos',
          moduleKey: 'torneos',
          disabled: !hasActive,
          disabledReason: 'No hay torneo activo',
        },
        {
          label: 'Tabla',
          href: tablaHref || '/admin/torneos',
          moduleKey: 'torneos',
          disabled: !hasActive,
          disabledReason: 'No hay torneo activo',
        },
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
    {
      title: 'TRIBUNAL',
      items: [
        { label: 'Multas', href: '/tribunal/multas', moduleKey: 'multas' },
      ],
    },
  ];

  const canAccessItem = (item: MenuItem): boolean => {
    if (item.placeholder) return isAdminRole;
    if (item.moduleKey) return hasModule(item.moduleKey);
    return true;
  };

  const isGroupActive = (group: MenuGroup): boolean =>
    group.items.some((item) => location.pathname === item.href.split('?')[0]);

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
              <div key={item.label}>
                {idx > 0 && <MenubarSeparator />}

                {item.placeholder ? (
                  <MenubarItem disabled className="text-sm">
                    {item.label}
                    <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
                  </MenubarItem>
                ) : item.disabled ? (
                  <MenubarItem disabled className="text-sm">
                    {item.label}
                    {item.disabledReason && (
                      <span className="ml-auto text-xs text-muted-foreground">{item.disabledReason}</span>
                    )}
                  </MenubarItem>
                ) : (
                  <MenubarItem
                    asChild
                    className={cn(
                      'cursor-pointer text-sm',
                      location.pathname === item.href.split('?')[0] && 'bg-accent font-semibold'
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
