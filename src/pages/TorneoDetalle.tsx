import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Users, Layers, CalendarDays, Trash2, Wand2, Pencil, Goal, BarChart3, Trophy, ClipboardList } from 'lucide-react';
import { calcularDistribucionZonas, repartirEquiposEnZonas, generarFixtureRoundRobin } from '@/lib/torneo';
import { EditarPartidoDialog } from '@/components/torneo/EditarPartidoDialog';
import { CargarResultadoDialog } from '@/components/torneo/CargarResultadoDialog';
import { TablaPosiciones } from '@/components/torneo/TablaPosiciones';
import { FasesFinalesTab } from '@/components/torneo/FasesFinalesTab';
import { PlanillaArbitralDialog } from '@/components/torneo/PlanillaArbitralDialog';
import { GoleadoresPanel } from '@/components/torneo/GoleadoresPanel';
import { format } from 'date-fns';

export default function TorneoDetalle() {
  const { user, loading } = useAuth();
  const { id: torneoId } = useParams();
  const qc = useQueryClient();

  const { data: torneo } = useQuery({
    queryKey: ['torneo', torneoId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('torneos').select('*, temporadas(anio)').eq('id', torneoId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !loading && !!user && !!torneoId,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['all-categorias', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('id, nombre_categoria').order('nombre_categoria');
      if (error) throw error;
      return data;
    },
    enabled: !loading && !!user,
  });

  const { data: torneoCats = [], refetch: refetchCats } = useQuery({
    queryKey: ['torneo-cats', torneoId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('torneo_categorias')
        .select('*, categorias(nombre_categoria)')
        .eq('torneo_id', torneoId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !loading && !!user && !!torneoId,
  });

  const [openAdd, setOpenAdd] = useState(false);
  const [catSel, setCatSel] = useState('');

  const agregarCategoria = async () => {
    if (!catSel || !torneoId) return;
    // 1. crear torneo_categoria
    const { data: tc, error } = await supabase
      .from('torneo_categorias')
      .insert({ torneo_id: torneoId, categoria_id: catSel })
      .select('id')
      .single();
    if (error) return toast.error(error.message);
    // 2. cargar equipos desde equipo_categoria de la temporada del torneo
    const anio = torneo?.temporadas?.anio;
    const { data: ecs } = await supabase
      .from('equipo_categoria')
      .select('equipo_id')
      .eq('categoria_id', catSel)
      .eq('temporada', anio);
    if (ecs && ecs.length > 0) {
      const rows = ecs.map((e) => ({ torneo_categoria_id: tc.id, equipo_id: e.equipo_id }));
      const { error: e2 } = await supabase.from('torneo_equipos').insert(rows);
      if (e2) toast.error('Categoría creada, pero falló cargar equipos: ' + e2.message);
      else toast.success(`Categoría agregada con ${rows.length} equipo(s)`);
    } else {
      toast.warning('Categoría agregada (sin equipos en equipo_categoria para esa temporada)');
    }
    setOpenAdd(false);
    setCatSel('');
    refetchCats();
    qc.invalidateQueries({ queryKey: ['torneo-list'] });
  };

  const catsDisponibles = categorias.filter((c) => !torneoCats.some((tc) => tc.categoria_id === c.id));

  if (!torneo) return <div className="p-8 text-muted-foreground">Cargando torneo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/torneos">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Volver</Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-display font-bold">{torneo.nombre} {torneo.temporadas?.anio}</h2>
          <Badge variant="outline" className="mt-1">{torneo.estado}</Badge>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button disabled={catsDisponibles.length === 0}><Plus className="w-4 h-4" /> Agregar categoría</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Agregar categoría al torneo</DialogTitle></DialogHeader>
            <Select value={catSel} onValueChange={setCatSel}>
              <SelectTrigger><SelectValue placeholder="Elegir categoría..." /></SelectTrigger>
              <SelectContent>
                {catsDisponibles.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre_categoria}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Se cargarán automáticamente los equipos inscriptos en esa categoría para la temporada {torneo.temporadas?.anio}.</p>
            <DialogFooter><Button onClick={agregarCategoria}>Agregar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {torneoCats.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Aún no agregaste categorías a este torneo.
        </CardContent></Card>
      ) : (
        <Tabs defaultValue={torneoCats[0].id}>
          <TabsList className="flex-wrap h-auto">
            {torneoCats.map((tc) => (
              <TabsTrigger key={tc.id} value={tc.id}>{tc.categorias?.nombre_categoria}</TabsTrigger>
            ))}
          </TabsList>
          {torneoCats.map((tc) => (
            <TabsContent key={tc.id} value={tc.id}>
              <CategoriaPanel torneoCategoriaId={tc.id} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function CategoriaPanel({ torneoCategoriaId }: { torneoCategoriaId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: equipos = [], refetch: refetchEqs } = useQuery({
    queryKey: ['torneo-equipos', torneoCategoriaId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('torneo_equipos')
        .select('id, equipo_id, equipos(nombre_equipo)')
        .eq('torneo_categoria_id', torneoCategoriaId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: zonas = [], refetch: refetchZonas } = useQuery({
    queryKey: ['zonas', torneoCategoriaId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zonas')
        .select('*, zona_equipos(id, equipo_id, orden, equipos(nombre_equipo))')
        .eq('torneo_categoria_id', torneoCategoriaId)
        .order('orden');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: partidos = [], refetch: refetchPartidos } = useQuery({
    queryKey: ['partidos', torneoCategoriaId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidos')
        .select('*, local:equipos!partidos_equipo_local_id_fkey(nombre_equipo), visitante:equipos!partidos_equipo_visitante_id_fkey(nombre_equipo), libre:equipos!partidos_equipo_libre_id_fkey(nombre_equipo)')
        .eq('torneo_categoria_id', torneoCategoriaId)
        .order('zona_id')
        .order('fecha_numero');
      if (error) return [] as any[]; // FK aliases pueden variar; fallback simple
      return data as any[];
    },
    enabled: !!user,
  });

  // ---- Generar zonas ----
  const generarZonas = async () => {
    const total = equipos.length;
    const { ok, zonas: cant, mensaje } = calcularDistribucionZonas(total);
    if (!ok) return toast.error(mensaje || 'No se puede distribuir');

    // borrar zonas anteriores
    await supabase.from('zonas').delete().eq('torneo_categoria_id', torneoCategoriaId);

    const grupos = repartirEquiposEnZonas(equipos, cant);
    for (let i = 0; i < grupos.length; i++) {
      const nombre = `Zona ${String.fromCharCode(65 + i)}`;
      const { data: z, error } = await supabase
        .from('zonas')
        .insert({ torneo_categoria_id: torneoCategoriaId, nombre, orden: i })
        .select('id')
        .single();
      if (error) return toast.error(error.message);
      const rows = grupos[i].map((eq: any, idx) => ({ zona_id: z.id, equipo_id: eq.equipo_id, orden: idx }));
      await supabase.from('zona_equipos').insert(rows);
    }
    toast.success(`Zonas generadas: ${cant.join(' / ')}`);
    refetchZonas();
  };

  const moverEquipo = async (zonaEquipoId: string, nuevaZonaId: string) => {
    const { error } = await supabase.from('zona_equipos').update({ zona_id: nuevaZonaId }).eq('id', zonaEquipoId);
    if (error) return toast.error(error.message);
    refetchZonas();
  };

  const renombrarZona = async (zonaId: string, nombre: string) => {
    const { error } = await supabase.from('zonas').update({ nombre }).eq('id', zonaId);
    if (error) return toast.error(error.message);
    refetchZonas();
  };

  const eliminarZona = async (zonaId: string) => {
    if (!confirm('¿Eliminar esta zona y sus partidos?')) return;
    await supabase.from('zonas').delete().eq('id', zonaId);
    refetchZonas();
    refetchPartidos();
  };

  // ---- Generar fixture ----
  const generarFixture = async () => {
    if (zonas.length === 0) return toast.error('Generá zonas primero');
    if (!confirm('Esto regenerará el fixture de todas las zonas (y borrará partidos previos de fase grupos). ¿Continuar?')) return;

    // datos torneo
    const { data: tc } = await supabase
      .from('torneo_categorias')
      .select('torneo_id, categoria_id')
      .eq('id', torneoCategoriaId)
      .single();
    if (!tc) return toast.error('No se encontró torneo_categoria');

    // borrar partidos y fechas previos de fase grupos
    await supabase.from('partidos').delete().eq('torneo_categoria_id', torneoCategoriaId).eq('fase', 'grupos');
    await supabase.from('fechas_torneo').delete().eq('torneo_categoria_id', torneoCategoriaId);

    for (const z of zonas) {
      const eqs = (z.zona_equipos || []).map((ze: any) => ({ id: ze.equipo_id }));
      if (eqs.length < 2) continue;
      const fechas = generarFixtureRoundRobin(eqs);
      for (let i = 0; i < fechas.length; i++) {
        const { data: ft, error: ef } = await supabase
          .from('fechas_torneo')
          .insert({
            torneo_categoria_id: torneoCategoriaId,
            zona_id: z.id,
            numero: i + 1,
            nombre: `Fecha ${i + 1}`,
            fase: 'grupos',
          })
          .select('id')
          .single();
        if (ef) { toast.error(ef.message); return; }
        const rows = fechas[i].map((m: any) => ({
          torneo_id: tc.torneo_id,
          torneo_categoria_id: torneoCategoriaId,
          categoria_id: tc.categoria_id,
          zona_id: z.id,
          fecha_torneo_id: ft.id,
          fase: 'grupos',
          fecha_numero: i + 1,
          equipo_local_id: m.local?.id ?? null,
          equipo_visitante_id: m.visitante?.id ?? null,
          equipo_libre_id: (fechas[i] as any).libre?.id ?? null,
          estado: 'programado',
        }));
        if (rows.length > 0) {
          const { error: ep } = await supabase.from('partidos').insert(rows);
          if (ep) { toast.error(ep.message); return; }
        }
      }
    }
    toast.success('Fixture generado');
    refetchPartidos();
  };

  const [editPartido, setEditPartido] = useState<any | null>(null);
  const [resPartido, setResPartido] = useState<any | null>(null);
  const [planillaPartido, setPlanillaPartido] = useState<any | null>(null);

  return (
    <div className="space-y-4 mt-4">
      <Tabs defaultValue="equipos">
        <TabsList>
          <TabsTrigger value="equipos"><Users className="w-4 h-4 mr-1" /> Equipos ({equipos.length})</TabsTrigger>
          <TabsTrigger value="zonas"><Layers className="w-4 h-4 mr-1" /> Zonas ({zonas.length})</TabsTrigger>
          <TabsTrigger value="fixture"><CalendarDays className="w-4 h-4 mr-1" /> Fixture ({partidos.length})</TabsTrigger>
          <TabsTrigger value="posiciones"><BarChart3 className="w-4 h-4 mr-1" /> Posiciones</TabsTrigger>
          <TabsTrigger value="finales"><Trophy className="w-4 h-4 mr-1" /> Fases finales</TabsTrigger>
          <TabsTrigger value="goleadores"><Goal className="w-4 h-4 mr-1" /> Goleadores</TabsTrigger>
        </TabsList>

        <TabsContent value="equipos">
          <Card><CardContent className="py-4">
            {equipos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin equipos inscriptos. Asegurate de cargarlos en equipo_categoria.</p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {equipos.map((e: any) => (
                  <li key={e.id} className="px-3 py-2 border rounded-md text-sm">{e.equipos?.nombre_equipo}</li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="zonas">
          <div className="flex justify-end mb-2">
            <Button onClick={generarZonas}><Wand2 className="w-4 h-4" /> Generar zonas automáticamente</Button>
          </div>
          {zonas.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Sin zonas. Generalas automáticamente.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {zonas.map((z: any) => (
                <Card key={z.id}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <input
                      defaultValue={z.nombre}
                      onBlur={(e) => e.target.value !== z.nombre && renombrarZona(z.id, e.target.value)}
                      className="font-bold bg-transparent border-b border-transparent hover:border-input focus:border-primary outline-none"
                    />
                    <Button size="icon" variant="ghost" onClick={() => eliminarZona(z.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {(z.zona_equipos || []).map((ze: any) => (
                        <li key={ze.id} className="flex items-center gap-2">
                          <span className="flex-1">{ze.equipos?.nombre_equipo}</span>
                          <Select value={z.id} onValueChange={(v) => moverEquipo(ze.id, v)}>
                            <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {zonas.map((zz: any) => <SelectItem key={zz.id} value={zz.id}>{zz.nombre}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">{(z.zona_equipos || []).length} equipo(s)</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fixture">
          <div className="flex justify-end mb-2">
            <Button onClick={generarFixture}><Wand2 className="w-4 h-4" /> Generar fixture</Button>
          </div>
          {partidos.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Sin partidos. Generá el fixture.</CardContent></Card>
          ) : (
            <FixtureView partidos={partidos} zonas={zonas} onEditar={setEditPartido} onResultado={setResPartido} onPlanilla={setPlanillaPartido} />
          )}
        </TabsContent>

        <TabsContent value="posiciones">
          <TablaPosiciones partidos={partidos as any} zonas={zonas} equipos={equipos as any} />
        </TabsContent>

        <TabsContent value="finales">
          <FasesFinalesTab torneoCategoriaId={torneoCategoriaId} />
        </TabsContent>

        <TabsContent value="goleadores">
          <GoleadoresPanel torneoCategoriaId={torneoCategoriaId} />
        </TabsContent>
      </Tabs>

      <EditarPartidoDialog partido={editPartido} open={!!editPartido} onOpenChange={(v) => !v && setEditPartido(null)} onSaved={refetchPartidos} />
      <CargarResultadoDialog partido={resPartido} open={!!resPartido} onOpenChange={(v) => !v && setResPartido(null)} onSaved={refetchPartidos} />
      <PlanillaArbitralDialog partido={planillaPartido} open={!!planillaPartido} onOpenChange={(v) => !v && setPlanillaPartido(null)} onSaved={refetchPartidos} />
    </div>
  );
}

function FixtureView({ partidos, zonas, onEditar, onResultado }: { partidos: any[]; zonas: any[]; onEditar: (p: any) => void; onResultado: (p: any) => void; }) {
  const porZona: Record<string, Record<number, any[]>> = {};
  for (const p of partidos) {
    const zid = p.zona_id || 'sin';
    porZona[zid] = porZona[zid] || {};
    porZona[zid][p.fecha_numero || 0] = porZona[zid][p.fecha_numero || 0] || [];
    porZona[zid][p.fecha_numero || 0].push(p);
  }
  const nombreZona = (zid: string) => zonas.find((z) => z.id === zid)?.nombre || 'Sin zona';

  const tieneResultado = (p: any) => p.goles_local != null && p.goles_visitante != null;

  return (
    <div className="space-y-4">
      {Object.entries(porZona).map(([zid, fechas]) => (
        <Card key={zid}>
          <CardHeader><CardTitle className="text-base">{nombreZona(zid)}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(fechas).sort(([a], [b]) => Number(a) - Number(b)).map(([n, ps]) => (
                <div key={n}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">FECHA {n}</p>
                  <ul className="space-y-1 text-sm">
                    {ps.map((p) => (
                      <li key={p.id} className="px-3 py-1.5 border rounded flex items-center gap-2 flex-wrap">
                        <span className="flex-1 text-right">{p.local?.nombre_equipo || '—'}</span>
                        {tieneResultado(p) ? (
                          <span className="font-bold text-primary tabular-nums">
                            {p.goles_local} - {p.goles_visitante}
                            {p.hubo_penales && <span className="text-xs text-muted-foreground ml-1">({p.penales_local}-{p.penales_visitante} pen)</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">vs</span>
                        )}
                        <span className="flex-1">{p.visitante?.nombre_equipo || '—'}</span>
                        {p.libre && <Badge variant="outline">Libre: {p.libre?.nombre_equipo}</Badge>}
                        {p.estado === 'suspendido' && <Badge variant="destructive">Suspendido</Badge>}
                        {p.dia && <Badge variant="secondary" className="text-xs">{format(new Date(p.dia), 'dd/MM')} {p.hora ? String(p.hora).slice(0,5) : ''}</Badge>}
                        <div className="flex items-center gap-1 ml-2">
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
