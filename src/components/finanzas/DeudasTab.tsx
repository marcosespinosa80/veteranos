import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import { RegistrarPagoDialog } from './RegistrarPagoDialog';

const TIPO_LABELS: Record<string, string> = {
  inscripcion_jugador: 'Inscripción Jugador',
  inscripcion_equipo: 'Inscripción Equipo',
  cuota_mensual: 'Cuota Mensual',
  pase: 'Pase',
  multa: 'Multa',
  arbitraje: 'Arbitraje',
  otro: 'Otro',
};

export function DeudasTab() {
  const [searchJugador, setSearchJugador] = useState('');
  const [searchEquipo, setSearchEquipo] = useState('');
  const [pagoOpen, setPagoOpen] = useState(false);
  const [pagoPreload, setPagoPreload] = useState<any>(null);

  const openPagoJugador = (jugadorId: string, dni: string) => {
    setPagoPreload({ type: 'jugador', jugadorId, jugadorDni: dni });
    setPagoOpen(true);
  };
  const openPagoEquipo = (equipoId: string) => {
    setPagoPreload({ type: 'equipo', equipoId });
    setPagoOpen(true);
  };

  // Cargos pendientes de jugadores
  const { data: cargosJugadores = [] } = useQuery({
    queryKey: ['deudas-jugadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('*, jugadores!cargos_jugador_id_fkey(nombre, apellido, dni)')
        .in('estado_pago', ['pendiente', 'vencido'])
        .not('jugador_id', 'is', null)
        .order('fecha_emision', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Cargos pendientes de equipos
  const { data: cargosEquipos = [] } = useQuery({
    queryKey: ['deudas-equipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('*, equipos!cargos_equipo_id_fkey(nombre_equipo)')
        .in('estado_pago', ['pendiente', 'vencido'])
        .not('equipo_id', 'is', null)
        .order('fecha_emision', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  const filteredJugadores = cargosJugadores.filter((c: any) => {
    if (!searchJugador) return true;
    const s = searchJugador.toLowerCase();
    return (
      c.jugadores?.apellido?.toLowerCase().includes(s) ||
      c.jugadores?.nombre?.toLowerCase().includes(s) ||
      c.jugadores?.dni?.includes(s)
    );
  });

  const filteredEquipos = cargosEquipos.filter((c: any) => {
    if (!searchEquipo) return true;
    return c.equipos?.nombre_equipo?.toLowerCase().includes(searchEquipo.toLowerCase());
  });

  // Aggregate by jugador
  const deudaPorJugador = new Map<string, { nombre: string; dni: string; total: number; count: number }>();
  filteredJugadores.forEach((c: any) => {
    const key = c.jugador_id;
    const existing = deudaPorJugador.get(key) || { nombre: `${c.jugadores?.apellido}, ${c.jugadores?.nombre}`, dni: c.jugadores?.dni || '', total: 0, count: 0 };
    existing.total += Number(c.monto);
    existing.count += 1;
    deudaPorJugador.set(key, existing);
  });

  const deudaPorEquipo = new Map<string, { nombre: string; total: number; count: number }>();
  filteredEquipos.forEach((c: any) => {
    const key = c.equipo_id;
    const existing = deudaPorEquipo.get(key) || { nombre: c.equipos?.nombre_equipo || '', total: 0, count: 0 };
    existing.total += Number(c.monto);
    existing.count += 1;
    deudaPorEquipo.set(key, existing);
  });

  return (
    <>
    <Tabs defaultValue="jugadores" className="w-full">
      <TabsList>
        <TabsTrigger value="jugadores">Por Jugador</TabsTrigger>
        <TabsTrigger value="equipos">Por Club</TabsTrigger>
      </TabsList>

      <TabsContent value="jugadores" className="space-y-4">
        <Input
          placeholder="Buscar por nombre o DNI..."
          value={searchJugador}
          onChange={(e) => setSearchJugador(e.target.value)}
          className="max-w-sm"
        />
        {deudaPorJugador.size === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay deudas de jugadores.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Cargos</TableHead>
                <TableHead>Deuda Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(deudaPorJugador.entries()).sort((a, b) => b[1].total - a[1].total).map(([id, d]) => (
                <TableRow key={id}>
                  <TableCell className="font-medium">{d.nombre}</TableCell>
                  <TableCell>{d.dni}</TableCell>
                  <TableCell><Badge variant="outline">{d.count}</Badge></TableCell>
                  <TableCell className="font-bold text-destructive">{formatMoney(d.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => openPagoJugador(id, d.dni)}
                      disabled={d.total <= 0}
                    >
                      <DollarSign className="w-4 h-4 mr-1" /> Pagar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="equipos" className="space-y-4">
        <Input
          placeholder="Buscar por club..."
          value={searchEquipo}
          onChange={(e) => setSearchEquipo(e.target.value)}
          className="max-w-sm"
        />
        {deudaPorEquipo.size === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay deudas de clubes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead>Cargos</TableHead>
                <TableHead>Deuda Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(deudaPorEquipo.entries()).sort((a, b) => b[1].total - a[1].total).map(([id, d]) => (
                <TableRow key={id}>
                  <TableCell className="font-medium">{d.nombre}</TableCell>
                  <TableCell><Badge variant="outline">{d.count}</Badge></TableCell>
                  <TableCell className="font-bold text-destructive">{formatMoney(d.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => openPagoEquipo(id)}
                      disabled={d.total <= 0}
                    >
                      <DollarSign className="w-4 h-4 mr-1" /> Pagar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>
    </Tabs>
    <RegistrarPagoDialog open={pagoOpen} onOpenChange={setPagoOpen} preload={pagoPreload} />
    </>
  );
}
