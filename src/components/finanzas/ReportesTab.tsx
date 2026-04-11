import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function ReportesTab() {
  // Recaudación por medio de pago
  const { data: pagos = [] } = useQuery({
    queryKey: ['reportes-pagos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pagos').select('medio_pago, monto_total, fecha_pago');
      if (error) throw error;
      return data;
    },
  });

  // Top deudores jugadores
  const { data: topJugadores = [] } = useQuery({
    queryKey: ['reportes-top-jugadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('jugador_id, monto, jugadores!cargos_jugador_id_fkey(nombre, apellido, dni)')
        .in('estado_pago', ['pendiente', 'vencido'])
        .not('jugador_id', 'is', null);
      if (error) throw error;
      // Aggregate
      const map = new Map<string, { nombre: string; total: number }>();
      (data || []).forEach((c: any) => {
        const existing = map.get(c.jugador_id) || { nombre: `${c.jugadores?.apellido}, ${c.jugadores?.nombre}`, total: 0 };
        existing.total += Number(c.monto);
        map.set(c.jugador_id, existing);
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([id, d]) => ({ id, ...d }));
    },
  });

  // Top deudores equipos
  const { data: topEquipos = [] } = useQuery({
    queryKey: ['reportes-top-equipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('equipo_id, monto, equipos!cargos_equipo_id_fkey(nombre_equipo)')
        .in('estado_pago', ['pendiente', 'vencido'])
        .not('equipo_id', 'is', null);
      if (error) throw error;
      const map = new Map<string, { nombre: string; total: number }>();
      (data || []).forEach((c: any) => {
        const existing = map.get(c.equipo_id) || { nombre: c.equipos?.nombre_equipo || '', total: 0 };
        existing.total += Number(c.monto);
        map.set(c.equipo_id, existing);
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([id, d]) => ({ id, ...d }));
    },
  });

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  // Recaudación por medio
  const porMedio: Record<string, number> = {};
  pagos.forEach((p: any) => {
    porMedio[p.medio_pago] = (porMedio[p.medio_pago] || 0) + Number(p.monto_total);
  });

  const MEDIO_LABELS: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro' };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Recaudación por medio */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recaudación por Medio de Pago</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(porMedio).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos de recaudación.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(porMedio).map(([medio, total]) => (
                <div key={medio} className="flex justify-between items-center">
                  <Badge variant="outline">{MEDIO_LABELS[medio] || medio}</Badge>
                  <span className="font-bold">{formatMoney(total)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatMoney(Object.values(porMedio).reduce((a, b) => a + b, 0))}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top deudores jugadores */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 Deudores — Jugadores</CardTitle></CardHeader>
        <CardContent>
          {topJugadores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin deudores.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead className="text-right">Deuda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topJugadores.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.nombre}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{formatMoney(d.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top deudores equipos */}
      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">Top 10 Deudores — Clubes</CardTitle></CardHeader>
        <CardContent>
          {topEquipos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin deudores.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead className="text-right">Deuda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEquipos.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.nombre}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{formatMoney(d.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
