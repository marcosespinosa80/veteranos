import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AsignarMultaDialog } from '@/components/finanzas/AsignarMultaDialog';
import { format } from 'date-fns';

export default function Multas() {
  const { role } = useAuth();
  const isAdmin = role === 'admin_general' || role === 'admin_comun' || role === 'tribunal';

  const { data: multas = [] } = useQuery({
    queryKey: ['multas-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('*, jugadores!cargos_jugador_id_fkey(nombre, apellido, dni), equipos!cargos_equipo_id_fkey(nombre_equipo)')
        .eq('tipo', 'multa')
        .order('fecha_emision', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  const estadoBadge = (estado: string) => {
    if (estado === 'pagado') return <Badge className="bg-green-600">Pagado</Badge>;
    if (estado === 'vencido') return <Badge variant="destructive">Vencido</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tribunal — Multas</h1>
          <p className="text-muted-foreground text-sm">Gestión de multas a jugadores y clubes</p>
        </div>
        {isAdmin && <AsignarMultaDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Multas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {multas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay multas registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {multas.map((m: any) => {
                  const dest = m.jugadores
                    ? `${m.jugadores.apellido}, ${m.jugadores.nombre} (DNI ${m.jugadores.dni})`
                    : m.equipos?.nombre_equipo || '—';
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.fecha_emision), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{dest}</TableCell>
                      <TableCell className="max-w-xs truncate">{m.descripcion || '—'}</TableCell>
                      <TableCell className="font-bold">{formatMoney(Number(m.monto))}</TableCell>
                      <TableCell>{estadoBadge(m.estado_pago)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
