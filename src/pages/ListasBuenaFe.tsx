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
  const isAdmin = role === 'admin_general' || role === 'admin_comun';

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

  // Jugadores for the selected lista's team + category
  const { data: jugadoresDisponibles = [] } = useQuery({
    queryKey: ['jugadores-lista', selectedLista?.equipo_id, selectedLista?.categoria_id],
    enabled: !!selectedLista,
    queryFn: async () => {
      let query = supabase
        .from('jugadores')
        .select('id, nombre, apellido, dni, estado')
        .eq('equipo_id', selectedLista.equipo_id)
        .order('apellido');
      if (selectedLista.categoria_id) {
        query = query.eq('categoria_id', selectedLista.categoria_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Items of the selected lista
  const { data: listaItems = [] } = useQuery({
    queryKey: ['lista-items', selectedLista?.id],
    enabled: !!selectedLista,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lista_buena_fe_items')
        .select('*, jugador:jugadores(nombre, apellido, dni, estado)')
        .eq('lista_id', selectedLista.id);
      if (error) throw error;
      return data;
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
  const jugadoresParaAgregar = jugadoresDisponibles.filter((j: any) => !jugadoresYaEnLista.has(j.id));
  const isBorrador = selectedLista?.estado === 'borrador';
  const isObservada = selectedLista?.estado === 'observada';
  const canEdit = isBorrador || isObservada;

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
                      <Badge variant="outline" className={estadoColors[l.estado] || ''}>
                        {estadoLabels[l.estado] || l.estado}
                      </Badge>
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
                    {listaItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.jugador?.apellido}, {item.jugador?.nombre}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.jugador?.dni}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.estado_item === 'incluido' ? 'bg-primary/15 text-primary border-primary/30 text-xs' : 'text-xs'}>
                            {item.estado_item}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItemMutation.mutate(item.id)}>
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Add jugadores (only in borrador/observada) */}
          {canEdit && jugadoresParaAgregar.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-sm font-medium">Agregar jugadores</h4>
              <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                {jugadoresParaAgregar.map((j: any) => (
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
              {selectedJugadores.length > 0 && (
                <Button size="sm" onClick={() => addItemsMutation.mutate(selectedJugadores)} disabled={addItemsMutation.isPending}>
                  Agregar {selectedJugadores.length} jugador{selectedJugadores.length !== 1 ? 'es' : ''}
                </Button>
              )}
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Delegado/Admin: send borrador */}
            {(isBorrador || isObservada) && listaItems.length > 0 && (
              <Button
                onClick={() => changeEstadoMutation.mutate({ id: selectedLista.id, estado: 'enviada' })}
                disabled={changeEstadoMutation.isPending}
                className="gap-1"
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
                  onClick={() => changeEstadoMutation.mutate({ id: selectedLista.id, estado: 'observada' })}
                  disabled={changeEstadoMutation.isPending}
                  className="gap-1"
                >
                  <AlertCircle className="w-4 h-4" /> Observar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => changeEstadoMutation.mutate({ id: selectedLista.id, estado: 'rechazada' })}
                  disabled={changeEstadoMutation.isPending}
                  className="gap-1"
                >
                  <XCircle className="w-4 h-4" /> Rechazar
                </Button>
              </>
            )}

            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
