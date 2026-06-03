import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClubCard } from '@/components/clubes/ClubCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Users,
  Shield,
  ClipboardList,
  ArrowRightLeft,
  CreditCard,
  DollarSign,
  Trophy,
  AlertTriangle,
  Activity,
  ArrowRight,
  Plus,
  ReceiptText,
  UserPlus,
  ClipboardPlus,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// -------- KPI Card --------
interface KpiCardProps {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'muted';
}

const TONE_BG: Record<NonNullable<KpiCardProps['tone']>, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/20 text-secondary-foreground',
  success: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

function KpiCard({ label, value, hint, icon: Icon, to, tone = 'primary' }: KpiCardProps) {
  return (
    <Link to={to} className="group block">
      <Card className="border-border/60 hover:border-primary/40 hover:shadow-md transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', TONE_BG[tone])}>
              <Icon className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-display font-bold leading-none">{value}</p>
            <p className="text-sm font-medium text-foreground mt-2">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// -------- Quick Action --------
function QuickAction({
  icon: Icon,
  label,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 hover:border-primary/40 hover:bg-accent/40 transition-all"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium flex-1">{label}</span>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

// -------- Alert Row --------
function AlertRow({
  icon: Icon,
  label,
  count,
  tone,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  tone: 'warning' | 'destructive' | 'primary';
  to: string;
}) {
  const toneCls =
    tone === 'destructive'
      ? 'bg-destructive/10 text-destructive border-destructive/20'
      : tone === 'warning'
      ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20'
      : 'bg-primary/10 text-primary border-primary/20';
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 hover:border-primary/40 hover:bg-accent/30 transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center shrink-0', toneCls)}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-sm font-medium truncate">{label}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="font-bold">
          {count}
        </Badge>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

// -------- Status Dot --------
function StatusRow({ label, status, hint }: { label: string; status: 'ok' | 'warn' | 'bad' | 'idle'; hint: string }) {
  const dot =
    status === 'ok'
      ? 'bg-[hsl(var(--success))]'
      : status === 'warn'
      ? 'bg-[hsl(var(--warning))]'
      : status === 'bad'
      ? 'bg-destructive'
      : 'bg-muted-foreground/40';
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3">
        <span className={cn('w-2.5 h-2.5 rounded-full', dot)} />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function Dashboard() {
  const { profile, role, user, loading: authLoading } = useAuth();
  const { hasModule } = usePermissions();
  const navigate = useNavigate();
  const isDelegado = role === 'delegado';
  const delegadoEquipoId = profile?.equipo_id ?? null;

  const firstName = profile?.nombre?.split(' ')[0] || 'Bienvenido';

  // Delegado's club card data
  const { data: miClub } = useQuery({
    queryKey: ['mi-club', delegadoEquipoId],
    enabled: !authLoading && !!user && isDelegado && !!delegadoEquipoId,
    queryFn: async () => {
      const [eqRes, catRes, jugRes] = await Promise.all([
        supabase
          .from('equipos')
          .select('*, delegado1:jugadores!equipos_delegado_1_jugador_fkey(id, nombre, apellido), delegado2:jugadores!equipos_delegado_2_jugador_fkey(id, nombre, apellido)')
          .eq('id', delegadoEquipoId!)
          .maybeSingle(),
        supabase
          .from('equipo_categoria')
          .select('categoria_id, categorias(id, nombre_categoria)')
          .eq('equipo_id', delegadoEquipoId!)
          .eq('temporada', 2026),
        supabase
          .from('jugadores')
          .select('id', { count: 'exact', head: true })
          .eq('equipo_id', delegadoEquipoId!),
      ]);
      if (eqRes.error) throw eqRes.error;
      return {
        equipo: eqRes.data,
        categorias: ((catRes.data ?? []).map((d: any) => d.categorias).filter(Boolean)) as { id: string; nombre_categoria: string }[],
        jugadorCount: jugRes.count ?? 0,
      };
    },
  });

  // KPIs
  const { data: jugadorCount = 0 } = useQuery({
    queryKey: ['stat-jugadores'],
    queryFn: async () => {
      const { count } = await supabase.from('jugadores').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: equipoCount = 0 } = useQuery({
    queryKey: ['stat-equipos'],
    queryFn: async () => {
      const { count } = await supabase
        .from('equipos')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo');
      return count || 0;
    },
  });

  const { data: listasPendientes = 0 } = useQuery({
    queryKey: ['stat-listas'],
    queryFn: async () => {
      const { count } = await supabase
        .from('listas_buena_fe')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['borrador', 'enviada', 'observada']);
      return count || 0;
    },
  });

  const { data: pasesPendientes = 0 } = useQuery({
    queryKey: ['stat-pases'],
    queryFn: async () => {
      const { count } = await supabase
        .from('pases')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['iniciado', 'pendiente_firmas', 'revision_liga', 'observado', 'pendiente_pago']);
      return count || 0;
    },
  });

  const { data: carnetsCount = 0 } = useQuery({
    queryKey: ['stat-carnets'],
    queryFn: async () => {
      const { count } = await supabase
        .from('carnets')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo');
      return count || 0;
    },
  });

  const { data: cargosPendientes = 0 } = useQuery({
    queryKey: ['stat-cargos-pend'],
    queryFn: async () => {
      const { count } = await supabase
        .from('cargos')
        .select('*', { count: 'exact', head: true })
        .eq('estado_pago', 'pendiente');
      return count || 0;
    },
  });

  const { data: torneosActivos = 0 } = useQuery({
    queryKey: ['stat-torneos-activos'],
    queryFn: async () => {
      const { count } = await supabase
        .from('torneos')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['en_curso', 'en_configuracion']);
      return count || 0;
    },
  });

  const hasFinanzas = hasModule('finanzas');

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Hola, {firstName} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bienvenido al sistema de gestión de la Liga de Veteranos de Fútbol de Catamarca.
          </p>
        </div>
        {hasModule('jugadores') && (
          <Button asChild className="shrink-0">
            <Link to="/jugadores">
              <Plus className="w-4 h-4" />
              Nuevo jugador
            </Link>
          </Button>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Jugadores" hint="Registrados" value={jugadorCount} icon={Users} to="/jugadores" tone="primary" />
        <KpiCard label="Clubes activos" hint="En la liga" value={equipoCount} icon={Shield} to="/equipos" tone="success" />
        <KpiCard
          label="Listas pendientes"
          hint="Por revisar"
          value={listasPendientes}
          icon={ClipboardList}
          to="/listas-buena-fe"
          tone="warning"
        />
        <KpiCard
          label="Pases pendientes"
          hint="Por resolver"
          value={pasesPendientes}
          icon={ArrowRightLeft}
          to="/pases"
          tone="secondary"
        />
        <KpiCard label="Carnets" hint="Activos" value={carnetsCount} icon={CreditCard} to="/carnets" tone="primary" />
        {hasFinanzas && (
          <KpiCard
            label="Cargos pendientes"
            hint="Por cobrar"
            value={cargosPendientes}
            icon={DollarSign}
            to="/finanzas"
            tone="destructive"
          />
        )}
      </div>

      {/* Middle: quick actions + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick actions */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-1 h-5 bg-secondary rounded-full" />
              Accesos rápidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasModule('jugadores') && <QuickAction icon={UserPlus} label="Nuevo jugador" to="/jugadores" />}
              {hasModule('listas_buena_fe') && (
                <QuickAction icon={ClipboardPlus} label="Nueva lista de buena fe" to="/listas-buena-fe" />
              )}
              {hasModule('pases') && <QuickAction icon={ArrowRightLeft} label="Nuevo pase" to="/pases" />}
              {hasFinanzas && <QuickAction icon={ReceiptText} label="Registrar pago" to="/finanzas" />}
              {hasModule('torneos') && <QuickAction icon={Trophy} label="Crear / ver torneos" to="/admin/torneos" />}
              {hasModule('carnets') && <QuickAction icon={CreditCard} label="Generar carnet" to="/carnets" />}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />
              Alertas importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {listasPendientes === 0 && pasesPendientes === 0 && cargosPendientes === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No hay alertas pendientes.</p>
            ) : (
              <>
                {listasPendientes > 0 && (
                  <AlertRow
                    icon={ClipboardList}
                    label="Listas por revisar"
                    count={listasPendientes}
                    tone="warning"
                    to="/listas-buena-fe"
                  />
                )}
                {pasesPendientes > 0 && (
                  <AlertRow
                    icon={ArrowRightLeft}
                    label="Pases pendientes"
                    count={pasesPendientes}
                    tone="primary"
                    to="/pases"
                  />
                )}
                {hasFinanzas && cargosPendientes > 0 && (
                  <AlertRow
                    icon={DollarSign}
                    label="Cargos sin cobrar"
                    count={cargosPendientes}
                    tone="destructive"
                    to="/finanzas"
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: activity + status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No hay actividad reciente todavía.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Las acciones recientes del sistema aparecerán aquí.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full" />
              Estado general
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <StatusRow
              label="Competición"
              status={torneosActivos > 0 ? 'ok' : 'idle'}
              hint={torneosActivos > 0 ? `${torneosActivos} activo${torneosActivos > 1 ? 's' : ''}` : 'Sin configurar'}
            />
            <StatusRow
              label="Finanzas"
              status={cargosPendientes === 0 ? 'ok' : cargosPendientes > 10 ? 'bad' : 'warn'}
              hint={cargosPendientes === 0 ? 'Al día' : `${cargosPendientes} pendiente${cargosPendientes > 1 ? 's' : ''}`}
            />
            <StatusRow
              label="Tribunal"
              status="ok"
              hint="Sin casos"
            />
            <StatusRow label="Clubes" status="ok" hint={`${equipoCount} activos`} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
