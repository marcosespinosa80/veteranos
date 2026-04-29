import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calcularTabla, type Partido } from '@/lib/posiciones';

interface Props {
  partidos: Partido[];
  zonas: any[];
  equipos: { equipo_id: string; equipos: { nombre_equipo: string } }[];
}

export function TablaPosiciones({ partidos, zonas, equipos }: Props) {
  const equiposPlanos = equipos.map((e) => ({ id: e.equipo_id, nombre_equipo: e.equipos?.nombre_equipo || '—' }));
  const general = calcularTabla(equiposPlanos, partidos);

  const tablasZona = zonas.map((z: any) => {
    const eqsZona = (z.zona_equipos || []).map((ze: any) => ({ id: ze.equipo_id, nombre_equipo: ze.equipos?.nombre_equipo || '—' }));
    const psZona = partidos.filter((p) => p.zona_id === z.id);
    return { zona: z, tabla: calcularTabla(eqsZona, psZona) };
  });

  const Header = () => (
    <TableHeader>
      <TableRow>
        <TableHead className="w-8">#</TableHead>
        <TableHead>Equipo</TableHead>
        <TableHead className="text-center">PJ</TableHead>
        <TableHead className="text-center">PG</TableHead>
        <TableHead className="text-center">PE</TableHead>
        <TableHead className="text-center">PP</TableHead>
        <TableHead className="text-center">GF</TableHead>
        <TableHead className="text-center">GC</TableHead>
        <TableHead className="text-center">DG</TableHead>
        <TableHead className="text-center font-bold">PTS</TableHead>
      </TableRow>
    </TableHeader>
  );

  const Filas = ({ tabla }: { tabla: ReturnType<typeof calcularTabla> }) => (
    <TableBody>
      {tabla.map((f, i) => (
        <TableRow key={f.equipo_id}>
          <TableCell className="font-mono">{i + 1}</TableCell>
          <TableCell className="font-medium">{f.equipo}</TableCell>
          <TableCell className="text-center">{f.pj}</TableCell>
          <TableCell className="text-center">{f.pg}</TableCell>
          <TableCell className="text-center">{f.pe}</TableCell>
          <TableCell className="text-center">{f.pp}</TableCell>
          <TableCell className="text-center">{f.gf}</TableCell>
          <TableCell className="text-center">{f.gc}</TableCell>
          <TableCell className="text-center">{f.dg > 0 ? `+${f.dg}` : f.dg}</TableCell>
          <TableCell className="text-center font-bold text-primary">{f.pts}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  return (
    <div className="space-y-4">
      {tablasZona.map(({ zona, tabla }) => (
        <Card key={zona.id}>
          <CardHeader><CardTitle className="text-base">{zona.nombre}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table><Header /><Filas tabla={tabla} /></Table>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader><CardTitle className="text-base">Tabla general de la categoría</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table><Header /><Filas tabla={general} /></Table>
        </CardContent>
      </Card>
    </div>
  );
}
