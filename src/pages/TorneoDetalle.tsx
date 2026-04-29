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
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Users, Layers, CalendarDays, Trash2, Wand2, Pencil, Goal, BarChart3, Trophy, ClipboardList,
  MoreVertical, Settings, X, Ban,
} from 'lucide-react';
import { calcularDistribucionZonas, repartirEquiposEnZonas, generarFixtureRoundRobin } from '@/lib/torneo';
import { EditarPartidoDialog } from '@/components/torneo/EditarPartidoDialog';
import { CargarResultadoDialog } from '@/components/torneo/CargarResultadoDialog';
import { TablaPosiciones } from '@/components/torneo/TablaPosiciones';
import { FasesFinalesTab } from '@/components/torneo/FasesFinalesTab';
import { PlanillaArbitralDialog } from '@/components/torneo/PlanillaArbitralDialog';
import { GoleadoresPanel } from '@/components/torneo/GoleadoresPanel';
import { ConfirmDialog } from '@/components/torneo/ConfirmDialog';
import { ConfigCategoriaDialog } from '@/components/torneo/ConfigCategoriaDialog';
import { CrearPartidoDialog } from '@/components/torneo/CrearPartidoDialog';
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
  const [configTc, setConfigTc] = useState<any | null>(null);

  const agregarCategoria = async () => {
    if (!catSel || !torneoId) return;
    const { data: tc, error } = await supabase
      .from('torneo_categorias')
      .insert({ torneo_id: torneoId, categoria_id: catSel })
      .select('id')
      .single();
    if (error) return toast.error(error.message);
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

  // Quitar categoría: revisa si hay partidos con resultado
  const quitarCategoria = async (tc: any) => {
    const { count: conResultado } = await supabase
      .from('partidos').select('id', { count: 'exact', head: true })
      .eq('torneo_categoria_id', tc.id)
      .not('goles_local', 'is', null);
    if ((conResultado ?? 0) > 0) {
      return toast.error(`No se puede quitar: hay ${conResultado} partido(s) con resultado. Archivá la categoría.`);
    }
    // Borrar en cascada manual: partidos -> fechas_torneo -> zona_equipos -> zonas -> torneo_equipos -> torneo_categoria
    await supabase.from('partidos').delete().eq('torneo_categoria_id', tc.id);
    await supabase.from('fechas_torneo').delete().eq('torneo_categoria_id', tc.id);
    const { data: zs } = await supabase.from('zonas').select('id').eq('torneo_categoria_id', tc.id);
    const zIds = (zs || []).map((z: any) => z.id);
    if (zIds.length > 0) await supabase.from('zona_equipos').delete().in('zona_id', zIds);
    await supabase.from('zonas').delete().eq('torneo_categoria_id', tc.id);
    await supabase.from('torneo_equipos').delete().eq('torneo_categoria_id', tc.id);
    const { error } = await supabase.from('torneo_categorias').delete().eq('id', tc.id);
    if (error) return toast.error(error.message);
    toast.success('Categoría quitada del torneo');
    refetchCats();
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
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setConfigTc(tc)}>
                  <Settings className="w-4 h-4" /> Configurar categoría
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="w-4 h-4" /> Quitar categoría
                    </Button>
                  }
                  title="¿Quitar categoría del torneo?"
                  description="Si la categoría ya tiene fixture generado, se eliminarán zonas y partidos asociados. Si hay resultados cargados, no se podrá quitar."
                  onConfirm={() => quitarCategoria(tc)}
                  danger
                  confirmLabel="Quitar"
                />
              </div>
              <CategoriaPanel torneoCategoriaId={tc.id} torneoId={torneoId!} categoriaId={tc.categoria_id} temporadaAnio={torneo?.temporadas?.anio} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <ConfigCategoriaDialog
        torneoCategoria={configTc}
        open={!!configTc}
        onOpenChange={(v) => !v && setConfigTc(null)}
        onSaved={refetchCats}
      />
    </div>
  );
}

function CategoriaPanel({ torneoCategoriaId, torneoId, categoriaId, temporadaAnio }: { torneoCategoriaId: string; torneoId: string; categoriaId: string; temporadaAnio?: number }) {
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
      if (error) return [] as any[];
      return data as any[];
    },
    enabled: !!user,
  });

  // Equipos disponibles (en equipo_categoria de la temporada y aún no inscriptos en este torneo_categoria)
  const { data: equiposDisponibles = [] } = useQuery({
    queryKey: ['eq-disp', torneoCategoriaId, categoriaId, temporadaAnio, user?.id, equipos.length],
    queryFn: async () => {
      if (!temporadaAnio) return [];
      const { data: ecs } = await supabase
        .from('equipo_categoria')
        .select('equipo_id, equipos(id, nombre_equipo)')
        .eq('categoria_id', categoriaId)
        .eq('temporada', temporadaAnio);
      const yaIds = new Set(equipos.map((e: any) => e.equipo_id));
      return (ecs || [])
        .filter((x: any) => !yaIds.has(x.equipo_id))
        .map((x: any) => x.equipos)
        .filter(Boolean);
    },
    enabled: !!user && !!temporadaAnio,
  });

  const tieneFixture = partidos.length > 0;
  const tieneResultados = partidos.some((p: any) => p.goles_local != null);

  // ---- Equipos participantes ----
  const [agregarEqId, setAgregarEqId] = useState<string>('');
  const agregarEquipo = async () => {
    if (!agregarEqId) return;
    const { error } = await supabase.from('torneo_equipos').insert({
      torneo_categoria_id: torneoCategoriaId,
      equipo_id: agregarEqId,
    });
    if (error) return toast.error(error.message);
    toast.success('Equipo agregado');
    setAgregarEqId('');
    refetchEqs();
  };

  const quitarEquipo = async (te: any) => {
    // Bloquear si hay partidos con resultado donde participa
    const { count } = await supabase
      .from('partidos').select('id', { count: 'exact', head: true })
      .eq('torneo_categoria_id', torneoCategoriaId)
      .or(`equipo_local_id.eq.${te.equipo_id},equipo_visitante_id.eq.${te.equipo_id}`)
      .not('goles_local', 'is', null);
    if ((count ?? 0) > 0) {
      return toast.error('No se puede quitar: el equipo tiene partidos con resultado cargado.');
    }
    // Quitar de zona_equipos y partidos sin resultado
    const zIds = zonas.map((z: any) => z.id);
    if (zIds.length > 0) {
      await supabase.from('zona_equipos').delete().eq('equipo_id', te.equipo_id).in('zona_id', zIds);
    }
    await supabase.from('partidos').delete()
      .eq('torneo_categoria_id', torneoCategoriaId)
      .or(`equipo_local_id.eq.${te.equipo_id},equipo_visitante_id.eq.${te.equipo_id}`)
      .is('goles_local', null);
    const { error } = await supabase.from('torneo_equipos').delete().eq('id', te.id);
    if (error) return toast.error(error.message);
    toast.success('Equipo quitado');
    refetchEqs(); refetchZonas(); refetchPartidos();
  };

  // ---- Zonas ----
  const [generandoZonas, setGenerandoZonas] = useState(false);
  const generarZonas = async () => {
    if (generandoZonas) return;
    const total = equipos.length;
    if (total === 0) return toast.error('Primero agregá equipos a la categoría.');
    if (total < 7) return toast.error('No hay equipos suficientes para formar una zona válida.');
    if (tieneFixture) return toast.error('No se pueden regenerar zonas porque ya existe fixture generado.');
    if (tieneResultados) return toast.error('Hay resultados cargados; no se pueden regenerar zonas.');

    const { ok, zonas: cant, mensaje } = calcularDistribucionZonas(total);
    if (!ok || cant.length === 0) return toast.error(mensaje || 'No se puede distribuir');

    if (zonas.length > 0) {
      if (!confirm('Ya existen zonas. ¿Querés reemplazarlas?')) return;
    }

    setGenerandoZonas(true);
    const tId = toast.loading('Generando zonas...');
    try {
      const zIdsExist = zonas.map((z: any) => z.id);
      if (zIdsExist.length > 0) {
        await supabase.from('zona_equipos').delete().in('zona_id', zIdsExist);
        await supabase.from('zonas').delete().in('id', zIdsExist);
      }

      const grupos = repartirEquiposEnZonas(equipos, cant);
      for (let i = 0; i < grupos.length; i++) {
        const nombre = `Zona ${String.fromCharCode(65 + i)}`;
        const { data: z, error } = await supabase
          .from('zonas')
          .insert({ torneo_categoria_id: torneoCategoriaId, nombre, orden: i })
          .select('id')
          .single();
        if (error) throw error;
        const rows = grupos[i].map((eq: any, idx) => ({ zona_id: z.id, equipo_id: eq.equipo_id, orden: idx }));
        if (rows.length > 0) {
          const { error: e2 } = await supabase.from('zona_equipos').insert(rows);
          if (e2) throw e2;
        }
      }
      toast.success(`Zonas generadas: ${cant.join(' / ')}`, { id: tId });
      await refetchZonas();
      await qc.invalidateQueries({ queryKey: ['torneo-categorias'] });
    } catch (e: any) {
      toast.error(e?.message || 'Error generando zonas', { id: tId });
    } finally {
      setGenerandoZonas(false);
    }
  };

  const crearZonaManual = async () => {
    const proxLetra = String.fromCharCode(65 + zonas.length);
    const { error } = await supabase.from('zonas').insert({
      torneo_categoria_id: torneoCategoriaId,
      nombre: `Zona ${proxLetra}`,
      orden: zonas.length,
    });
    if (error) return toast.error(error.message);
    toast.success('Zona creada');
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
    // Bloquear si hay partidos con resultado en esa zona
    const { count } = await supabase
      .from('partidos').select('id', { count: 'exact', head: true })
      .eq('zona_id', zonaId).not('goles_local', 'is', null);
    if ((count ?? 0) > 0) return toast.error('La zona tiene partidos con resultado; no se puede eliminar.');
    await supabase.from('partidos').delete().eq('zona_id', zonaId);
    await supabase.from('zona_equipos').delete().eq('zona_id', zonaId);
    await supabase.from('zonas').delete().eq('id', zonaId);
    refetchZonas();
    refetchPartidos();
    toast.success('Zona eliminada');
  };

  const quitarEquipoDeZona = async (ze: any) => {
    const { error } = await supabase.from('zona_equipos').delete().eq('id', ze.id);
    if (error) return toast.error(error.message);
    refetchZonas();
  };

  // Equipos sin zona (para agregar a una zona)
  const equiposEnZonas = new Set<string>();
  for (const z of zonas) for (const ze of (z.zona_equipos || [])) equiposEnZonas.add(ze.equipo_id);
  const equiposSinZona = equipos.filter((e: any) => !equiposEnZonas.has(e.equipo_id));

  const agregarEqAZona = async (zonaId: string, equipoId: string) => {
    const { error } = await supabase.from('zona_equipos').insert({ zona_id: zonaId, equipo_id: equipoId, orden: 0 });
    if (error) return toast.error(error.message);
    refetchZonas();
  };

  // ---- Fixture ----
  const generarFixture = async () => {
    if (zonas.length === 0) return toast.error('Generá zonas primero');
    if (tieneResultados) return toast.error('Hay resultados cargados; no se puede regenerar el fixture.');
    if (!confirm('Esto regenerará el fixture de todas las zonas (y borrará partidos previos de fase grupos). ¿Continuar?')) return;

    const { data: tc } = await supabase
      .from('torneo_categorias')
      .select('torneo_id, categoria_id')
      .eq('id', torneoCategoriaId)
      .single();
    if (!tc) return toast.error('No se encontró torneo_categoria');

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

  const eliminarPartido = async (p: any) => {
    if (p.goles_local != null) return toast.error('Tiene resultado cargado; no se puede eliminar.');
    const { count } = await supabase.from('planilla_arbitral').select('id', { count: 'exact', head: true }).eq('partido_id', p.id);
    if ((count ?? 0) > 0) return toast.error('Tiene planilla arbitral; no se puede eliminar.');
    const { error } = await supabase.from('partidos').delete().eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('Partido eliminado');
    refetchPartidos();
  };

  const suspenderPartido = async (p: any) => {
    const nuevo = p.estado === 'suspendido' ? 'programado' : 'suspendido';
    const { error } = await supabase.from('partidos').update({ estado: nuevo }).eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success(nuevo === 'suspendido' ? 'Partido suspendido' : 'Partido reprogramado');
    refetchPartidos();
  };

  const [editPartido, setEditPartido] = useState<any | null>(null);
  const [resPartido, setResPartido] = useState<any | null>(null);
  const [planillaPartido, setPlanillaPartido] = useState<any | null>(null);
  const [crearPartidoOpen, setCrearPartidoOpen] = useState(false);

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

        {/* EQUIPOS */}
        <TabsContent value="equipos">
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={agregarEqId} onValueChange={setAgregarEqId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={equiposDisponibles.length > 0 ? 'Elegir equipo a agregar...' : 'Sin equipos disponibles'} />
                  </SelectTrigger>
                  <SelectContent>
                    {equiposDisponibles.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={agregarEquipo} disabled={!agregarEqId}>
                  <Plus className="w-4 h-4" /> Agregar equipo
                </Button>
              </div>
              {equipos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin equipos inscriptos.</p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {equipos.map((e: any) => (
                    <li key={e.id} className="px-3 py-2 border rounded-md text-sm flex items-center gap-2">
                      <span className="flex-1">{e.equipos?.nombre_equipo}</span>
                      <ConfirmDialog
                        trigger={<Button size="icon" variant="ghost" className="h-7 w-7"><X className="w-4 h-4 text-destructive" /></Button>}
                        title="¿Quitar equipo?"
                        description={tieneFixture ? 'El fixture ya fue generado. Se quitará al equipo de su zona y de partidos sin resultado.' : 'El equipo se quitará del torneo en esta categoría.'}
                        onConfirm={() => quitarEquipo(e)}
                        danger
                        confirmLabel="Quitar"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ZONAS */}
        <TabsContent value="zonas">
          <div className="flex justify-end mb-2 gap-2">
            <Button variant="outline" onClick={crearZonaManual}><Plus className="w-4 h-4" /> Nueva zona</Button>
            <Button onClick={generarZonas} disabled={generandoZonas}>
              <Wand2 className="w-4 h-4" /> {generandoZonas ? 'Generando zonas...' : 'Generar automáticamente'}
            </Button>
          </div>
          {zonas.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Sin zonas. Generalas o creá una manual.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {zonas.map((z: any) => (
                <Card key={z.id}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <input
                      defaultValue={z.nombre}
                      onBlur={(e) => e.target.value !== z.nombre && renombrarZona(z.id, e.target.value)}
                      className="font-bold bg-transparent border-b border-transparent hover:border-input focus:border-primary outline-none flex-1"
                    />
                    <ConfirmDialog
                      trigger={<Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                      title={`¿Eliminar ${z.nombre}?`}
                      description="Se eliminarán los partidos sin resultado y la asignación de equipos. Si hay resultados cargados, no se puede eliminar."
                      onConfirm={() => eliminarZona(z.id)}
                      danger
                    />
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {(z.zona_equipos || []).map((ze: any) => (
                        <li key={ze.id} className="flex items-center gap-2">
                          <span className="flex-1">{ze.equipos?.nombre_equipo}</span>
                          <Select value={z.id} onValueChange={(v) => moverEquipo(ze.id, v)}>
                            <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {zonas.map((zz: any) => <SelectItem key={zz.id} value={zz.id}>{zz.nombre}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => quitarEquipoDeZona(ze)}>
                            <X className="w-3 h-3 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    {equiposSinZona.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <Select value="" onValueChange={(v) => agregarEqAZona(z.id, v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="+ Agregar equipo sin zona" /></SelectTrigger>
                          <SelectContent>
                            {equiposSinZona.map((e: any) => (
                              <SelectItem key={e.equipo_id} value={e.equipo_id}>{e.equipos?.nombre_equipo}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{(z.zona_equipos || []).length} equipo(s)</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* FIXTURE */}
        <TabsContent value="fixture">
          <div className="flex justify-end mb-2 gap-2">
            <Button variant="outline" onClick={() => setCrearPartidoOpen(true)}><Plus className="w-4 h-4" /> Crear partido</Button>
            <Button onClick={generarFixture}><Wand2 className="w-4 h-4" /> Generar fixture</Button>
          </div>
          {partidos.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Sin partidos. Generá el fixture o creá uno manual.</CardContent></Card>
          ) : (
            <FixtureView
              partidos={partidos}
              zonas={zonas}
              onEditar={setEditPartido}
              onResultado={setResPartido}
              onPlanilla={setPlanillaPartido}
              onEliminar={eliminarPartido}
              onSuspender={suspenderPartido}
            />
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
      <CrearPartidoDialog
        open={crearPartidoOpen}
        onOpenChange={setCrearPartidoOpen}
        torneoCategoriaId={torneoCategoriaId}
        torneoId={torneoId}
        categoriaId={categoriaId}
        zonas={zonas}
        onSaved={refetchPartidos}
      />
    </div>
  );
}

function FixtureView({ partidos, zonas, onEditar, onResultado, onPlanilla, onEliminar, onSuspender }: {
  partidos: any[]; zonas: any[];
  onEditar: (p: any) => void;
  onResultado: (p: any) => void;
  onPlanilla: (p: any) => void;
  onEliminar: (p: any) => void;
  onSuspender: (p: any) => void;
}) {
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
                            <>
                              <Button size="icon" variant="ghost" onClick={() => onPlanilla(p)} title="Planilla arbitral">
                                <ClipboardList className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => onResultado(p)} title="Cargar resultado">
                                <Goal className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => onEditar(p)} title="Editar partido">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" title="Más acciones"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onSuspender(p)}>
                                <Ban className="w-4 h-4 mr-2" />
                                {p.estado === 'suspendido' ? 'Reprogramar' : 'Suspender'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onEliminar(p)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar partido
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
