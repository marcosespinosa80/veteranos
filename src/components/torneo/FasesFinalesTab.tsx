import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trophy, Wand2, Trash2, Goal, Pencil } from 'lucide-react';
import { calcularTabla } from '@/lib/posiciones';
import {
  obtenerClasificados,
  generarBracket,
  generarPosicionamiento,
  FASE_LABEL,
  type FaseFinal,
  type ZonaConTabla,
} from '@/lib/finales';
import { CargarResultadoDialog } from './CargarResultadoDialog';
import { EditarPartidoDialog } from './EditarPartidoDialog';

type Props = { torneoCategoriaId: string };

const FASES_ORDEN: FaseFinal[] = ['octavos', 'cuartos', 'semifinal', 'final'];

export function FasesFinalesTab({ torneoCategoriaId }: Props) {
  const { user } = useAuth();

  const { data: tc } = useQuery({
    queryKey: ['fin-tc', torneoCategoriaId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('torneo_categorias')
        .select('id, torneo_id, categoria_id, clasificacion_config')
        .eq('id', torneoCategoriaId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const { data: zonas = [] } = useQuery({
    queryKey: ['fin-zonas', torneoCategoriaId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zonas')
        .select('id, nombre, zona_equipos(equipo_id, equipos(id, nombre_equipo))')
        .eq('torneo_categoria_id', torneoCategoriaId)
        .order('orden');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: partidosGrupos = [] } = useQuery({
    queryKey: ['fin-partidos-grupos', torneoCategoriaId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidos')
        .select('id, zona_id, estado, equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, ganador_id, hubo_penales')
        .eq('torneo_categoria_id', torneoCategoriaId)
        .eq('fase', 'grupos');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: partidosFinales = [], refetch: refetchFinales } = useQuery({
    queryKey: ['fin-partidos-finales', torneoCategoriaId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidos')
        .select('*, local:equipos!partidos_equipo_local_id_fkey(nombre_equipo), visitante:equipos!partidos_equipo_visitante_id_fkey(nombre_equipo)')
        .eq('torneo_categoria_id', torneoCategoriaId)
        .in('fase', ['octavos', 'cuartos', 'semifinal', 'final', 'posicionamiento'])
        .order('fase')
        .order('fecha_numero');
      if (error) return [] as any[];
      return data as any[];
    },
    enabled: !!user,
  });

  // Build zonas+tabla
  const zonasConTabla: ZonaConTabla[] = useMemo(() => {
    return zonas.map((z: any) => {
      const eqs = (z.zona_equipos || []).map((ze: any) => ({ id: ze.equipo_id, nombre_equipo: ze.equipos?.nombre_equipo || '—' }));
      const ps = partidosGrupos.filter((p: any) => p.zona_id === z.id);
      return { zona_id: z.id, nombre: z.nombre, tabla: calcularTabla(eqs, ps as any) };
    });
  }, [zonas, partidosGrupos]);

  // Config local
  const config = (tc?.clasificacion_config as any) || { clasificados_por_zona: 2, total_clasificados: 8 };
  const [porZona, setPorZona] = useState<number>(config.clasificados_por_zona);
  const [totalCls, setTotalCls] = useState<number>(config.total_clasificados);

  const guardarConfig = async () => {
    const { error } = await supabase
      .from('torneo_categorias')
      .update({ clasificacion_config: { clasificados_por_zona: porZona, total_clasificados: totalCls } })
      .eq('id', torneoCategoriaId);
    if (error) return toast.error(error.message);
    toast.success('Configuración guardada');
  };

  const previa = useMemo(() => {
    if (zonasConTabla.length === 0) return null;
    try {
      return obtenerClasificados(zonasConTabla, { clasificados_por_zona: porZona, total_clasificados: totalCls as 4 | 8 | 16 });
    } catch (e: any) {
      return null;
    }
  }, [zonasConTabla, porZona, totalCls]);

  const generarFinales = async () => {
    if (!previa || !tc) return;
    if (previa.clasificados.length !== totalCls) {
      return toast.error(`Se obtuvieron ${previa.clasificados.length} clasificados; se esperaban ${totalCls}.`);
    }
    if (!confirm('Esto regenerará los partidos de fases finales (octavos/cuartos/semis/final). ¿Continuar?')) return;

    // Borrar finales previas
    await supabase.from('partidos').delete()
      .eq('torneo_categoria_id', torneoCategoriaId)
      .in('fase', ['octavos', 'cuartos', 'semifinal', 'final']);

    const { fase, cruces } = generarBracket(previa.clasificados);
    const rows = cruces.map((c, idx) => ({
      torneo_id: tc.torneo_id,
      torneo_categoria_id: torneoCategoriaId,
      categoria_id: tc.categoria_id,
      zona_id: null,
      fase,
      fecha_numero: idx + 1,
      equipo_local_id: c.local.equipo_id,
      equipo_visitante_id: c.visitante.equipo_id,
      estado: 'programado',
    }));
    const { error } = await supabase.from('partidos').insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Bracket generado: ${FASE_LABEL[fase]} (${cruces.length} cruces)`);
    refetchFinales();
  };

  const generarPos = async () => {
    if (!previa || !tc) return;
    if (previa.noClasificados.length < 2) return toast.error('No hay suficientes equipos para posicionamiento.');
    if (!confirm('Esto regenerará los partidos de posicionamiento. ¿Continuar?')) return;

    await supabase.from('partidos').delete()
      .eq('torneo_categoria_id', torneoCategoriaId)
      .eq('fase', 'posicionamiento');

    const cruces = generarPosicionamiento(previa.noClasificados);
    const rows = cruces.map((c, idx) => ({
      torneo_id: tc.torneo_id,
      torneo_categoria_id: torneoCategoriaId,
      categoria_id: tc.categoria_id,
      zona_id: null,
      fase: 'posicionamiento',
      fecha_numero: idx + 1,
      equipo_local_id: c.local.equipo_id,
      equipo_visitante_id: c.visitante.equipo_id,
      estado: 'programado',
    }));
    const { error } = await supabase.from('partidos').insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Posicionamiento generado: ${cruces.length} cruce(s)`);
    refetchFinales();
  };

  // Avanza ganadores a siguiente fase del bracket
  const avanzarRonda = async (faseActual: FaseFinal) => {
    if (!tc) return;
    const idx = FASES_ORDEN.indexOf(faseActual);
    if (idx === -1 || idx === FASES_ORDEN.length - 1) return toast.error('No hay fase siguiente');
    const siguiente = FASES_ORDEN[idx + 1];

    const partidosRonda = (partidosFinales as any[])
      .filter(p => p.fase === faseActual)
      .sort((a, b) => (a.fecha_numero || 0) - (b.fecha_numero || 0));

    const ganadores = partidosRonda.map(p => p.ganador_id);
    if (ganadores.some(g => !g)) return toast.error('Faltan resultados en esta ronda');
    if (ganadores.length < 2 || ganadores.length % 2 !== 0) return toast.error('Cantidad de ganadores inválida');

    if (!confirm(`Generar ${FASE_LABEL[siguiente]} con los ${ganadores.length} ganadores?`)) return;

    await supabase.from('partidos').delete()
      .eq('torneo_categoria_id', torneoCategoriaId)
      .eq('fase', siguiente);

    const rows = [];
    for (let i = 0; i < ganadores.length; i += 2) {
      rows.push({
        torneo_id: tc.torneo_id,
        torneo_categoria_id: torneoCategoriaId,
        categoria_id: tc.categoria_id,
        zona_id: null,
        fase: siguiente,
        fecha_numero: rows.length + 1,
        equipo_local_id: ganadores[i],
        equipo_visitante_id: ganadores[i + 1],
        estado: 'programado',
      });
    }
    const { error } = await supabase.from('partidos').insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${FASE_LABEL[siguiente]} generada`);
    refetchFinales();
  };

  const limpiarFinales = async () => {
    if (!confirm('Eliminar TODOS los partidos de fases finales y posicionamiento?')) return;
    await supabase.from('partidos').delete()
      .eq('torneo_categoria_id', torneoCategoriaId)
      .in('fase', ['octavos', 'cuartos', 'semifinal', 'final', 'posicionamiento']);
    refetchFinales();
    toast.success('Partidos de finales eliminados');
  };

  // Agrupar finales por fase
  const porFase: Record<string, any[]> = {};
  for (const p of partidosFinales as any[]) {
    porFase[p.fase] = porFase[p.fase] || [];
    porFase[p.fase].push(p);
  }

  const [resPartido, setResPartido] = useState<any | null>(null);
  const [editPartido, setEditPartido] = useState<any | null>(null);

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4" /> Configuración de clasificación</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>Clasificados por zona</Label>
              <Input type="number" min={1} max={4} value={porZona} onChange={(e) => setPorZona(Number(e.target.value))} />
            </div>
            <div>
              <Label>Total de clasificados</Label>
              <Select value={String(totalCls)} onValueChange={(v) => setTotalCls(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 (Semifinales)</SelectItem>
                  <SelectItem value="8">8 (Cuartos)</SelectItem>
                  <SelectItem value="16">16 (Octavos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={guardarConfig}>Guardar configuración</Button>
          </div>
        </CardContent>
      </Card>

      {previa && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vista previa de clasificación</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-semibold mb-1">Clasificados ({previa.clasificados.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                {previa.clasificados.map((c, i) => (
                  <div key={c.equipo_id} className="flex items-center gap-2 px-2 py-1 border rounded">
                    <span className="w-6 text-muted-foreground text-xs">{i + 1}°</span>
                    <span className="flex-1">{c.nombre}</span>
                    <Badge variant="outline" className="text-xs">{c.pts} pts</Badge>
                  </div>
                ))}
              </div>
            </div>
            {previa.noClasificados.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">No clasificados ({previa.noClasificados.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                  {previa.noClasificados.map((c, i) => (
                    <div key={c.equipo_id} className="flex items-center gap-2 px-2 py-1 border rounded text-muted-foreground">
                      <span className="w-6 text-xs">{totalCls + i + 1}°</span>
                      <span className="flex-1">{c.nombre}</span>
                      <Badge variant="outline" className="text-xs">{c.pts} pts</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={generarFinales}><Wand2 className="w-4 h-4" /> Generar bracket</Button>
              <Button variant="secondary" onClick={generarPos}><Wand2 className="w-4 h-4" /> Generar posicionamiento</Button>
              <Button variant="ghost" onClick={limpiarFinales}><Trash2 className="w-4 h-4" /> Limpiar finales</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render por fase */}
      {FASES_ORDEN.map((fase) => {
        const ps = porFase[fase];
        if (!ps || ps.length === 0) return null;
        const todosCargados = ps.every((p) => p.ganador_id);
        return (
          <Card key={fase}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{FASE_LABEL[fase]}</CardTitle>
              {todosCargados && fase !== 'final' && (
                <Button size="sm" onClick={() => avanzarRonda(fase)}><Wand2 className="w-4 h-4" /> Avanzar a {FASE_LABEL[FASES_ORDEN[FASES_ORDEN.indexOf(fase) + 1]]}</Button>
              )}
            </CardHeader>
            <CardContent>
              <PartidosLista partidos={ps} onResultado={setResPartido} onEditar={setEditPartido} />
            </CardContent>
          </Card>
        );
      })}

      {porFase['posicionamiento'] && (
        <Card>
          <CardHeader><CardTitle className="text-base">Posicionamiento (no clasificados)</CardTitle></CardHeader>
          <CardContent>
            <PartidosLista partidos={porFase['posicionamiento']} onResultado={setResPartido} onEditar={setEditPartido} />
          </CardContent>
        </Card>
      )}

      <CargarResultadoDialog partido={resPartido} open={!!resPartido} onOpenChange={(v) => !v && setResPartido(null)} onSaved={refetchFinales} />
      <EditarPartidoDialog partido={editPartido} open={!!editPartido} onOpenChange={(v) => !v && setEditPartido(null)} onSaved={refetchFinales} />
    </div>
  );
}

function PartidosLista({ partidos, onResultado, onEditar }: { partidos: any[]; onResultado: (p: any) => void; onEditar: (p: any) => void }) {
  return (
    <ul className="space-y-1 text-sm">
      {partidos.map((p) => (
        <li key={p.id} className="px-3 py-2 border rounded flex items-center gap-2 flex-wrap">
          <span className="flex-1 text-right font-medium">{p.local?.nombre_equipo || '—'}</span>
          {p.goles_local != null ? (
            <span className="font-bold text-primary tabular-nums">
              {p.goles_local} - {p.goles_visitante}
              {p.hubo_penales && <span className="text-xs text-muted-foreground ml-1">({p.penales_local}-{p.penales_visitante} pen)</span>}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">vs</span>
          )}
          <span className="flex-1 font-medium">{p.visitante?.nombre_equipo || '—'}</span>
          <div className="flex items-center gap-1">
            {p.equipo_local_id && p.equipo_visitante_id && (
              <Button size="icon" variant="ghost" onClick={() => onResultado(p)} title="Cargar resultado">
                <Goal className="w-4 h-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => onEditar(p)} title="Editar partido">
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
