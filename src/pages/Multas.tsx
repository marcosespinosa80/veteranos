import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import { AsignarMultaDialog } from '@/components/finanzas/AsignarMultaDialog';
import { RegistrarPagoDialog } from '@/components/finanzas/RegistrarPagoDialog';
import { format } from 'date-fns';

export default function Multas() {
  const { role } = useAuth();
  const isAdmin = role === 'admin_general' || role === 'admin_comun' || role === 'tribunal';
  const [pagoOpen, setPagoOpen] = useState(false);
  const [pagoPreload, setPagoPreload] = useState<any>(null);

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

  const handlePagar = (m: any) => {
    if (m.jugador_id) {
      setPagoPreload({ type: 'jugador', jugadorId: m.jugador_id, jugadorDni: m.jugadores?.dni });
    } else if (m.equipo_id) {
      setPagoPreload({ type: 'equipo', equipoId: m.equipo_id });
    }
    setPagoOpen(true);
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
                  <TableHead>DNI / Club</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {multas.map((m: any) => {
                  const dest = m.jugadores
                    ? `${m.jugadores.apellido}, ${m.jugadores.nombre}`
                    : m.equipos?.nombre_equipo || '—';
                  const dniOrClub = m.jugadores
                    ? m.jugadores.dni
                    : m.equipos?.nombre_equipo || '—';
                  const isPendiente = m.estado_pago === 'pendiente' || m.estado_pago === 'vencido';
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.fecha_emision), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{dest}</TableCell>
                      <TableCell>{dniOrClub}</TableCell>
                      <TableCell className="max-w-xs truncate">{m.descripcion || '—'}</TableCell>
                      <TableCell className="font-bold">{formatMoney(Number(m.monto))}</TableCell>
                      <TableCell>{estadoBadge(m.estado_pago)}</TableCell>
                      <TableCell className="text-right">
                        {isPendiente && isAdmin ? (
                          <Button size="sm" onClick={() => handlePagar(m)}>
                            <DollarSign className="w-4 h-4 mr-1" /> Pagar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RegistrarPagoDialog open={pagoOpen} onOpenChange={setPagoOpen} preload={pagoPreload} />
    </div>
  );
}
