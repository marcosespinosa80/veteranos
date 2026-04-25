import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Eye, DollarSign, Receipt } from 'lucide-react';
import { format, startOfMonth, startOfDay, endOfDay } from 'date-fns';

const TIPO_LABELS: Record<string, string> = {
  inscripcion_jugador: 'Inscripción Jugador',
  inscripcion_equipo: 'Inscripción Equipo',
  cuota_mensual: 'Cuota Mensual',
  pase: 'Pase',
  multa: 'Multa',
  arbitraje: 'Arbitraje',
  otro: 'Otro',
};

const MEDIO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  otro: 'Otro',
};

export function ReportesTab() {
  const today = new Date();
  const [desde, setDesde] = useState<string>(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [hasta, setHasta] = useState<string>(format(today, 'yyyy-MM-dd'));
  const [medio, setMedio] = useState<string>('todos');
  const [detalleId, setDetalleId] = useState<string | null>(null);

  // Pagos (con filtros)
  const { data: pagos = [] } = useQuery({
    queryKey: ['informes-pagos', desde, hasta, medio],
    queryFn: async () => {
      let q = supabase
        .from('pagos')
        .select('*, profiles!pagos_registrado_por_fkey(nombre, apellido)')
        .gte('fecha_pago', startOfDay(new Date(desde)).toISOString())
        .lte('fecha_pago', endOfDay(new Date(hasta)).toISOString())
        .order('fecha_pago', { ascending: false });
      if (medio !== 'todos') q = q.eq('medio_pago', medio);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Pago hoy (KPI)
  const { data: pagosHoy = [] } = useQuery({
    queryKey: ['informes-pagos-hoy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos')
        .select('monto_total')
        .gte('fecha_pago', startOfDay(new Date()).toISOString())
        .lte('fecha_pago', endOfDay(new Date()).toISOString());
      if (error) throw error;
      return data;
    },
  });

  // Detalle items del pago seleccionado
  const { data: detalleItems = [] } = useQuery({
    queryKey: ['informes-pago-detalle', detalleId],
    enabled: !!detalleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pago_items')
        .select(`
          monto_aplicado,
          cargos!pago_items_cargo_id_fkey(
            tipo,
            descripcion,
            monto,
            jugadores!cargos_jugador_id_fkey(nombre, apellido, dni),
            equipos!cargos_equipo_id_fkey(nombre_equipo)
          )
        `)
        .eq('pago_id', detalleId);
      if (error) throw error;
      return data;
    },
  });

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  const totalRango = pagos.reduce((s: number, p: any) => s + Number(p.monto_total), 0);
  const totalHoy = pagosHoy.reduce((s: number, p: any) => s + Number(p.monto_total), 0);

  // Recaudación por medio (en rango)
  const porMedio = useMemo(() => {
    const m: Record<string, number> = {};
    pagos.forEach((p: any) => {
      m[p.medio_pago] = (m[p.medio_pago] || 0) + Number(p.monto_total);
    });
    return m;
  }, [pagos]);

  const detallePago = pagos.find((p: any) => p.id === detalleId);

  const exportCsv = () => {
    const headers = ['Fecha', 'Monto', 'Medio', 'Referencia', 'Registrado por', 'Observaciones'];
    const rows = pagos.map((p: any) => [
      format(new Date(p.fecha_pago), 'yyyy-MM-dd HH:mm'),
      String(p.monto_total),
      MEDIO_LABELS[p.medio_pago] || p.medio_pago,
      p.referencia || '',
      p.profiles ? `${p.profiles.apellido} ${p.profiles.nombre}` : '',
      (p.observaciones || '').replace(/[\r\n,]/g, ' '),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagos_${desde}_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Medio de Pago</Label>
            <Select value={medio} onValueChange={setMedio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex flex-col justify-end">
            <Button variant="outline" onClick={exportCsv} disabled={pagos.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Ingresos */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-500/10 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recaudado Hoy</p>
              <p className="text-2xl font-bold">{formatMoney(totalHoy)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Rango</p>
              <p className="text-2xl font-bold">{formatMoney(totalRango)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-500/10 p-3">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cantidad de Pagos</p>
              <p className="text-2xl font-bold">{pagos.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recaudación por medio */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recaudación por Medio (rango)</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(porMedio).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos en el rango seleccionado.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(porMedio).map(([m, total]) => (
                <div key={m} className="flex justify-between items-center">
                  <Badge variant="outline">{MEDIO_LABELS[m] || m}</Badge>
                  <span className="font-bold">{formatMoney(total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial / Detalle de pagos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detalle de Pagos (Historial)</CardTitle></CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin pagos en el rango.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Medio</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.fecha_pago), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="font-bold">{formatMoney(Number(p.monto_total))}</TableCell>
                    <TableCell><Badge variant="outline">{MEDIO_LABELS[p.medio_pago] || p.medio_pago}</Badge></TableCell>
                    <TableCell>{p.referencia || '—'}</TableCell>
                    <TableCell>{p.profiles ? `${p.profiles.apellido}, ${p.profiles.nombre}` : '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.observaciones || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setDetalleId(p.id)}>
                        <Eye className="w-4 h-4 mr-1" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detalle modal */}
      <Dialog open={!!detalleId} onOpenChange={(v) => !v && setDetalleId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Pago</DialogTitle>
          </DialogHeader>
          {detallePago && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{format(new Date(detallePago.fecha_pago), 'dd/MM/yyyy HH:mm')}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">{formatMoney(Number(detallePago.monto_total))}</span></div>
                <div><span className="text-muted-foreground">Medio:</span> {MEDIO_LABELS[detallePago.medio_pago] || detallePago.medio_pago}</div>
                <div><span className="text-muted-foreground">Referencia:</span> {detallePago.referencia || '—'}</div>
              </div>
              {detallePago.observaciones && (
                <p className="text-sm bg-muted p-3 rounded">{detallePago.observaciones}</p>
              )}
              <div>
                <h4 className="font-semibold text-sm mb-2">Cargos Pagados</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Pertenece a</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleItems.map((it: any, idx: number) => {
                      const c = it.cargos;
                      const owner = c?.jugadores
                        ? `${c.jugadores.apellido}, ${c.jugadores.nombre} (DNI ${c.jugadores.dni})`
                        : c?.equipos?.nombre_equipo || '—';
                      return (
                        <TableRow key={idx}>
                          <TableCell>{TIPO_LABELS[c?.tipo] || c?.tipo}</TableCell>
                          <TableCell>{owner}</TableCell>
                          <TableCell className="max-w-xs truncate">{c?.descripcion || '—'}</TableCell>
                          <TableCell className="text-right font-bold">{formatMoney(Number(it.monto_aplicado))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
