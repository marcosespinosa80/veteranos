import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, ClipboardList, ArrowRightLeft } from 'lucide-react';

export default function Dashboard() {
  const { data: jugadorCount = 0 } = useQuery({
    queryKey: ['stat-jugadores'],
    queryFn: async () => {
      const { count, error } = await supabase.from('jugadores').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: equipoCount = 0 } = useQuery({
    queryKey: ['stat-equipos'],
    queryFn: async () => {
      const { count, error } = await supabase.from('equipos').select('*', { count: 'exact', head: true }).eq('estado', 'activo');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: listasPendientes = 0 } = useQuery({
    queryKey: ['stat-listas'],
    queryFn: async () => {
      const { count, error } = await supabase.from('listas_buena_fe').select('*', { count: 'exact', head: true }).in('estado', ['borrador', 'enviada', 'observada']);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pasesPendientes = 0 } = useQuery({
    queryKey: ['stat-pases'],
    queryFn: async () => {
      const { count, error } = await supabase.from('pases').select('*', { count: 'exact', head: true }).in('estado', ['iniciado', 'pendiente_firmas', 'revision_liga', 'observado', 'pendiente_pago']);
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = [
    { label: 'Jugadores', value: jugadorCount, icon: Users },
    { label: 'Equipos activos', value: equipoCount, icon: Shield },
    { label: 'Listas pendientes', value: listasPendientes, icon: ClipboardList },
    { label: 'Pases pendientes', value: pasesPendientes, icon: ArrowRightLeft },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bienvenido al sistema de gestión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Desde aquí podés administrar jugadores, equipos, listas de buena fe, pases y carnets de la Liga de Veteranos de Fútbol de Catamarca.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
