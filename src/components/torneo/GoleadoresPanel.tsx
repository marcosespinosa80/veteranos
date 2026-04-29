import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = { torneoCategoriaId: string };

export function GoleadoresPanel({ torneoCategoriaId }: Props) {
  const { user } = useAuth();

  const { data: ranking, isLoading } = useQuery({
    queryKey: ['goleadores-tc', torneoCategoriaId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: parts } = await supabase
        .from('partidos')
        .select('id')
        .eq('torneo_categoria_id', torneoCategoriaId);
      const ids = (parts || []).map((p: any) => p.id);
      if (ids.length === 0) return [];

      const { data: goles } = await supabase
        .from('goles_jugador')
        .select('jugador_id, equipo_id, cantidad')
        .in('partido_id', ids);

      const acc = new Map<string, { jugador_id: string; equipo_id: string; total: number }>();
      (goles || []).forEach((g: any) => {
        const cur = acc.get(g.jugador_id) ?? { jugador_id: g.jugador_id, equipo_id: g.equipo_id, total: 0 };
        cur.total += g.cantidad ?? 1;
        acc.set(g.jugador_id, cur);
      });
      const arr = Array.from(acc.values()).sort((a, b) => b.total - a.total);
      if (arr.length === 0) return [];

      const jugIds = arr.map((a) => a.jugador_id);
      const eqIds = Array.from(new Set(arr.map((a) => a.equipo_id)));
      const [{ data: jugs }, { data: equs }] = await Promise.all([
        supabase.from('jugadores').select('id, nombre, apellido').in('id', jugIds),
        supabase.from('equipos').select('id, nombre_equipo').in('id', eqIds),
      ]);
      const mJ = new Map((jugs || []).map((j: any) => [j.id, `${j.apellido}, ${j.nombre}`]));
      const mE = new Map((equs || []).map((e: any) => [e.id, e.nombre_equipo]));
      return arr.map((a) => ({
        ...a,
        jugador: mJ.get(a.jugador_id) ?? '—',
        equipo: mE.get(a.equipo_id) ?? '—',
      }));
    },
  });

  return (
    <Card className="mt-2">
      <CardHeader><CardTitle className="text-base">Tabla de goleadores</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isLoading ? (
          <p className="p-4 text-muted-foreground">Cargando…</p>
        ) : !ranking || ranking.length === 0 ? (
          <p className="p-4 text-center text-muted-foreground">Aún no hay goles cargados (vienen de la planilla arbitral).</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Jugador</th>
                <th className="px-3 py-2 text-left">Club</th>
                <th className="px-3 py-2 text-center">Goles</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.jugador_id} className="border-b">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.jugador}</td>
                  <td className="px-3 py-2">{r.equipo}</td>
                  <td className="px-3 py-2 text-center font-bold text-accent">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
