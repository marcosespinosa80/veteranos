import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Eye, Send, CheckCircle, XCircle, ClipboardList, Search, AlertCircle, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

const estadoColors: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  enviada: 'bg-warning/15 text-warning border-warning/30',
  observada: 'bg-destructive/15 text-destructive border-destructive/30',
  aprobada: 'bg-primary/15 text-primary border-primary/30',
  rechazada: 'bg-destructive/15 text-destructive border-destructive/30',
};

const estadoLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  observada: 'Observada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export default function ListasBuenaFe() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEquipo, setFilterEquipo] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLista, setSelectedLista] = useState<any>(null);
  const [createForm, setCreateForm] = useState({ equipo_id: '', categoria_id: '' });
  const [selectedJugadores, setSelectedJugadores] = useState<string[]>([]);
  const [observacion, setObservacion] = useState('');
  const [motivoDialog, setMotivoDialog] = useState<{ open: boolean; estado: 'observada' | 'rechazada' | null }>({ open: false, estado: null });
  const [motivo, setMotivo] = useState('');
  const isAdmin = role === 'admin_general' || role === 'admin_comun';

  const openMotivoDialog = (estado: 'observada' | 'rechazada') => {
    setMotivo('');
    setMotivoDialog({ open: true, estado });
  };

  const confirmMotivo = () => {
    const trimmed = motivo.trim();
    if (!trimmed || trimmed.length > 50 || !motivoDialog.estado || !selectedLista) return;
    const extra: Record<string, any> = motivoDialog.estado === 'observada'
      ? { motivo_observacion: trimmed, motivo_rechazo: null }
      : { motivo_rechazo: trimmed, motivo_observacion: null };
    changeEstadoMutation.mutate(
      { id: selectedLista.id, estado: motivoDialog.estado, extra },
      { onSuccess: () => setMotivoDialog({ open: false, estado: null }) }
    );
  };

  const { data: listas = [], isLoading } = useQuery({
    queryKey: ['listas-buena-fe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listas_buena_fe')
        .select('*, equipo:equipos(nombre_equipo), categoria:categorias(nombre_categoria), creador:profiles!listas_buena_fe_creada_por_fkey(nombre, apellido)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipos').select('id, nombre_equipo').eq('estado', 'activo').order('nombre_equipo');
      if (error) throw error;
      return data;
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('id, nombre_categoria').order('nombre_categoria');
      if (error) throw error;
      return data;
    },
  });

  // Jugadores for the selected lista's team + category (with deuda flag)
  const { data: jugadoresDisponibles = [] } = useQuery({
    queryKey: ['jugadores-lista', selectedLista?.equipo_id, selectedLista?.categoria_id],
    enabled: !!selectedLista,
    queryFn: async () => {
      let query = supabase
        .from('jugadores')
        .select('id, nombre, apellido, dni, estado, suspendido_fechas')
        .eq('equipo_id', selectedLista.equipo_id)
        .order('apellido');
      if (selectedLista.categoria_id) {
        query = query.eq('categoria_id', selectedLista.categoria_id);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Fetch pending debts for these jugadores
      const ids = (data || []).map((j: any) => j.id);
      let deudaSet = new Set<string>();
      if (ids.length > 0) {
        const { data: cargos, error: cargosErr } = await supabase
          .from('cargos')
          .select('jugador_id')
          .in('jugador_id', ids)
          .eq('estado_pago', 'pendiente');
        if (cargosErr) throw cargosErr;
        deudaSet = new Set((cargos || []).map((c: any) => c.jugador_id).filter(Boolean));
      }

      return (data || []).map((j: any) => ({ ...j, tiene_deuda: deudaSet.has(j.id) }));
    },
  });

  // Items of the selected lista (incluye deuda + suspensión del jugador)
  const { data: listaItems = [] } = useQuery({
    queryKey: ['lista-items', selectedLista?.id],
    enabled: !!selectedLista,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lista_buena_fe_items')
        .select('*, jugador:jugadores(id, nombre, apellido, dni, estado, suspendido_fechas)')
        .eq('lista_id', selectedLista.id);
      if (error) throw error;

      const ids = (data || []).map((i: any) => i.jugador?.id).filter(Boolean);
      let deudaSet = new Set<string>();
      if (ids.length > 0) {
        const { data: cargos } = await supabase
          .from('cargos')
          .select('jugador_id')
          .in('jugador_id', ids)
          .eq('estado_pago', 'pendiente');
        deudaSet = new Set((cargos || []).map((c: any) => c.jugador_id).filter(Boolean));
      }

      return (data || []).map((i: any) => ({
        ...i,
        tiene_deuda: i.jugador?.id ? deudaSet.has(i.jugador.id) : false,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('listas_buena_fe').insert({
        equipo_id: createForm.equipo_id,
        categoria_id: createForm.categoria_id,
        creada_por: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['listas-buena-fe'] });
      setCreateOpen(false);
      setCreateForm({ equipo_id: '', categoria_id: '' });
      setSelectedLista(data);
      setDetailOpen(true);
      toast({ title: 'Lista creada en borrador' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const addItemsMutation = useMutation({
    mutationFn: async (jugadorIds: string[]) => {
      const items = jugadorIds.map(jid => ({
        lista_id: selectedLista.id,
        jugador_id: jid,
      }));
      const { error } = await supabase.from('lista_buena_fe_items').insert(items);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-items', selectedLista?.id] });
      setSelectedJugadores([]);
      toast({ title: 'Jugadores agregados' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('lista_buena_fe_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-items', selectedLista?.id] });
      toast({ title: 'Jugador removido' });
    },
  });

  const changeEstadoMutation = useMutation({
    mutationFn: async ({ id, estado, extra }: { id: string; estado: string; extra?: Record<string, any> }) => {
      const payload: any = { estado, ...extra };
      if (estado === 'enviada') payload.fecha_envio = new Date().toISOString();
      if (estado === 'aprobada') {
        payload.fecha_aprobacion = new Date().toISOString();
        payload.aprobada_por = user!.id;
        payload.cerrada = true;
      }
      if (estado === 'rechazada') payload.cerrada = true;
      const { error } = await supabase.from('listas_buena_fe').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listas-buena-fe'] });
      setDetailOpen(false);
      setSelectedLista(null);
      toast({ title: 'Estado actualizado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const openDetail = (lista: any) => {
    setSelectedLista(lista);
    setDetailOpen(true);
    setSelectedJugadores([]);
  };

  const filtered = listas.filter((l: any) => {
    const matchSearch = l.equipo?.nombre_equipo?.toLowerCase().includes(search.toLowerCase());
    const matchEquipo = filterEquipo === 'all' || l.equipo_id === filterEquipo;
    const matchEstado = filterEstado === 'all' || l.estado === filterEstado;
    return matchSearch && matchEquipo && matchEstado;
  });

  const jugadoresYaEnLista = new Set(listaItems.map((i: any) => i.jugador_id));
  const jugadoresEnEquipo = jugadoresDisponibles.filter((j: any) => !jugadoresYaEnLista.has(j.id));
  const jugadoresAptos = jugadoresEnEquipo.filter((j: any) => (j.suspendido_fechas ?? 0) === 0 && !j.tiene_deuda);
  const jugadoresBloqueados = jugadoresEnEquipo.filter((j: any) => (j.suspendido_fechas ?? 0) > 0 || j.tiene_deuda);
  const jugadoresParaAgregar = jugadoresAptos;
  const isBorrador = selectedLista?.estado === 'borrador';
  const isObservada = selectedLista?.estado === 'observada';
  const isCongelada = selectedLista?.estado === 'aprobada' || selectedLista?.cerrada === true;
  const canEdit = (isBorrador || isObservada) && !isCongelada;
  const itemsNoAptos = listaItems.filter((i: any) => (i.jugador?.suspendido_fechas ?? 0) > 0 || i.tiene_deuda);
  const puedeEnviar = listaItems.length > 0 && itemsNoAptos.length === 0;

  const handleEnviar = () => {
    if (itemsNoAptos.length > 0) {
      toast({
        title: 'No se puede enviar la lista',
        description: 'Hay jugadores suspendidos o con deuda. Eliminarlos o regularizar antes de enviar.',
        variant: 'destructive',
      });
      return;
    }
    changeEstadoMutation.mutate({ id: selectedLista.id, estado: 'enviada' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por equipo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Nueva Lista
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterEquipo} onValueChange={setFilterEquipo}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Equipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {equipos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(estadoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} lista{filtered.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No se encontraron listas</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Temporada</TableHead>
                  <TableHead className="hidden lg:table-cell">Creada por</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                        {l.equipo?.nombre_equipo || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{l.categoria?.nombre_categoria || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{l.temporada}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {l.creador ? `${l.creador.apellido}, ${l.creador.nombre}` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={estadoColors[l.estado] || ''}>
                          {l.estado === 'aprobada' || l.cerrada ? 'APROBADA (CONGELADA)' : (estadoLabels[l.estado] || l.estado)}
                        </Badge>
                        {(l.estado === 'observada' && l.motivo_observacion) && (
                          <AlertCircle className="w-3.5 h-3.5 text-warning" aria-label={l.motivo_observacion}>
                            <title>{l.motivo_observacion}</title>
                          </AlertCircle>
                        )}
                        {(l.estado === 'rechazada' && l.motivo_rechazo) && (
                          <XCircle className="w-3.5 h-3.5 text-destructive" aria-label={l.motivo_rechazo}>
                            <title>{l.motivo_rechazo}</title>
                          </XCircle>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {l.estado === 'aprobada' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Descargar PDF"
                            onClick={(e) => { e.stopPropagation(); window.open(`/listas-buena-fe/${l.id}/pdf`, '_blank'); }}
                          >
                            <FileDown className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openDetail(l)} title="Ver detalle">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Lista de Buena Fe</DialogTitle>
            <DialogDescription>Seleccioná el equipo y la categoría para la lista.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Equipo *</Label>
              <Select value={createForm.equipo_id} onValueChange={(v) => setCreateForm({ ...createForm, equipo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                <SelectContent>
                  {equipos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={createForm.categoria_id} onValueChange={(v) => setCreateForm({ ...createForm, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre_categoria}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!createForm.equipo_id || !createForm.categoria_id || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Lista'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Lista de Buena Fe
              {selectedLista && (
                <Badge variant="outline" className={estadoColors[selectedLista.estado] || ''}>
                  {estadoLabels[selectedLista.estado] || selectedLista.estado}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedLista?.equipo?.nombre_equipo} — {selectedLista?.categoria?.nombre_categoria} — Temporada {selectedLista?.temporada}
            </DialogDescription>
          </DialogHeader>

          {selectedLista?.estado === 'observada' && selectedLista?.motivo_observacion && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
              <div>
                <p className="font-medium text-warning">Motivo de la observación</p>
                <p className="text-xs mt-0.5 text-foreground">{selectedLista.motivo_observacion}</p>
              </div>
            </div>
          )}
          {selectedLista?.estado === 'rechazada' && selectedLista?.motivo_rechazo && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Motivo del rechazo</p>
                <p className="text-xs mt-0.5 text-foreground">{selectedLista.motivo_rechazo}</p>
              </div>
            </div>
          )}

          {isCongelada && (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-primary">LISTA APROBADA — CONGELADA</p>
                <p className="text-xs mt-0.5 text-foreground">
                  No se puede modificar hasta finalizar el campeonato. Para el próximo torneo se debe crear una nueva lista.
                </p>
              </div>
            </div>
          )}

          {/* Current items */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Jugadores en la lista ({listaItems.length})</h4>
            {listaItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay jugadores en la lista aún.</p>
            ) : (
              <div className="border rounded-md max-h-52 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jugador</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Estado</TableHead>
                      {canEdit && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listaItems.map((item: any) => {
                      const susp = item.jugador?.suspendido_fechas ?? 0;
                      const noApto = susp > 0 || item.tiene_deuda;
                      return (
                        <TableRow key={item.id} className={noApto ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-sm">{item.jugador?.apellido}, {item.jugador?.nombre}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.jugador?.dni}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {susp > 0 && (
                                <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                                  SUSPENDIDO ({susp})
                                </Badge>
                              )}
                              {item.tiene_deuda && (
                                <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                                  CON DEUDA
                                </Badge>
                              )}
                              {!noApto && (
                                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-xs">
                                  HABILITADO
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItemMutation.mutate(item.id)}>
                                <XCircle className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Add jugadores (only in borrador/observada) */}
          {canEdit && jugadoresEnEquipo.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-medium">Agregar jugadores</h4>
                <p className="text-xs text-muted-foreground">
                  {jugadoresAptos.length} disponible{jugadoresAptos.length !== 1 ? 's' : ''} / {jugadoresBloqueados.length} bloqueado{jugadoresBloqueados.length !== 1 ? 's' : ''}
                </p>
              </div>

              {jugadoresAptos.length > 0 ? (
                <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {jugadoresAptos.map((j: any) => (
                    <label key={j.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedJugadores.includes(j.id)}
                        onCheckedChange={(checked) => {
                          setSelectedJugadores(prev =>
                            checked ? [...prev, j.id] : prev.filter(id => id !== j.id)
                          );
                        }}
                      />
                      <span>{j.apellido}, {j.nombre}</span>
                      <span className="text-muted-foreground ml-auto">{j.dni}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No hay jugadores disponibles para agregar.</p>
              )}

              {jugadoresBloqueados.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Ver {jugadoresBloqueados.length} jugador{jugadoresBloqueados.length !== 1 ? 'es' : ''} bloqueado{jugadoresBloqueados.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="border rounded-md max-h-32 overflow-y-auto p-2 space-y-1 mt-2">
                    {jugadoresBloqueados.map((j: any) => (
                      <div key={j.id} className="flex items-center gap-2 p-1">
                        <span className="text-muted-foreground">{j.apellido}, {j.nombre}</span>
                        <div className="ml-auto flex gap-1">
                          {(j.suspendido_fechas ?? 0) > 0 && (
                            <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                              SUSP. ({j.suspendido_fechas})
                            </Badge>
                          )}
                          {j.tiene_deuda && (
                            <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                              DEUDA
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {selectedJugadores.length > 0 && (
                <Button size="sm" onClick={() => addItemsMutation.mutate(selectedJugadores)} disabled={addItemsMutation.isPending}>
                  Agregar {selectedJugadores.length} jugador{selectedJugadores.length !== 1 ? 'es' : ''}
                </Button>
              )}
            </div>
          )}

          {/* Aviso si hay jugadores no aptos en la lista */}
          {canEdit && itemsNoAptos.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">No se puede enviar la lista</p>
                  <p className="text-xs mt-0.5">
                    Hay {itemsNoAptos.length} jugador{itemsNoAptos.length !== 1 ? 'es' : ''} suspendido{itemsNoAptos.length !== 1 ? 's' : ''} o con deuda. Eliminalos o regularizá su situación antes de enviar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Delegado/Admin: send borrador */}
            {(isBorrador || isObservada) && listaItems.length > 0 && (
              <Button
                onClick={handleEnviar}
                disabled={changeEstadoMutation.isPending || !puedeEnviar}
                className="gap-1"
                title={!puedeEnviar ? 'Hay jugadores suspendidos o con deuda' : undefined}
              >
                <Send className="w-4 h-4" /> Enviar para aprobación
              </Button>
            )}

            {/* Admin: approve/reject/observe */}
            {isAdmin && selectedLista?.estado === 'enviada' && (
              <>
                <Button
                  onClick={() => changeEstadoMutation.mutate({ id: selectedLista.id, estado: 'aprobada' })}
                  disabled={changeEstadoMutation.isPending}
                  className="gap-1"
                >
                  <CheckCircle className="w-4 h-4" /> Aprobar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openMotivoDialog('observada')}
                  disabled={changeEstadoMutation.isPending}
                  className="gap-1"
                >
                  <AlertCircle className="w-4 h-4" /> Observar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openMotivoDialog('rechazada')}
                  disabled={changeEstadoMutation.isPending}
                  className="gap-1"
                >
                  <XCircle className="w-4 h-4" /> Rechazar
                </Button>
              </>
            )}

            {selectedLista?.estado === 'aprobada' && (
              <Button
                variant="default"
                className="gap-1"
                onClick={() => window.open(`/listas-buena-fe/${selectedLista.id}/pdf`, '_blank')}
              >
                <FileDown className="w-4 h-4" /> Descargar PDF
              </Button>
            )}

            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Motivo Dialog (Observar / Rechazar) */}
      <Dialog open={motivoDialog.open} onOpenChange={(o) => !o && setMotivoDialog({ open: false, estado: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {motivoDialog.estado === 'observada' ? 'Observar lista' : 'Rechazar lista'}
            </DialogTitle>
            <DialogDescription>
              Indicá un motivo breve (máx. 50 caracteres). Será visible para el delegado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 50))}
              maxLength={50}
              rows={3}
              placeholder={motivoDialog.estado === 'observada' ? 'Ej: Falta DNI de jugador X' : 'Ej: Lista incompleta'}
            />
            <p className={`text-xs text-right ${motivo.length >= 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {motivo.length}/50
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMotivoDialog({ open: false, estado: null })}>
              Cancelar
            </Button>
            <Button
              variant={motivoDialog.estado === 'rechazada' ? 'destructive' : 'default'}
              onClick={confirmMotivo}
              disabled={!motivo.trim() || motivo.length > 50 || changeEstadoMutation.isPending}
            >
              {motivoDialog.estado === 'observada' ? 'Confirmar Observación' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
