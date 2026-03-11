import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Search, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface JugadorForm {
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  equipo_id: string | null;
  telefono: string;
  direccion: string;
  estado: 'habilitado' | 'no_habilitado' | 'expulsado';
}

const emptyForm: JugadorForm = {
  nombre: '', apellido: '', dni: '', fecha_nacimiento: '', equipo_id: null,
  telefono: '', direccion: '', estado: 'no_habilitado',
};

const estadoColors: Record<string, string> = {
  habilitado: 'bg-primary/15 text-primary border-primary/30',
  no_habilitado: 'bg-warning/15 text-warning border-warning/30',
  expulsado: 'bg-destructive/15 text-destructive border-destructive/30',
};

const estadoLabels: Record<string, string> = {
  habilitado: 'Habilitado',
  no_habilitado: 'No habilitado',
  expulsado: 'Expulsado',
};

export default function Jugadores() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEquipo, setFilterEquipo] = useState<string>('all');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JugadorForm>(emptyForm);
  const isAdmin = role === 'admin_general' || role === 'admin_comun';

  const { data: jugadores = [], isLoading } = useQuery({
    queryKey: ['jugadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jugadores')
        .select('*, equipo:equipos(nombre_equipo), categoria:categorias(nombre_categoria)')
        .order('apellido');
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

  const saveMutation = useMutation({
    mutationFn: async (data: JugadorForm & { id?: string }) => {
      const payload = {
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        dni: data.dni.trim(),
        fecha_nacimiento: data.fecha_nacimiento,
        equipo_id: data.equipo_id || null,
        telefono: data.telefono.trim() || null,
        direccion: data.direccion.trim() || null,
        estado: data.estado,
      };
      if (data.id) {
        const { error } = await supabase.from('jugadores').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('jugadores').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jugadores'] });
      queryClient.invalidateQueries({ queryKey: ['jugador-counts'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? 'Jugador actualizado' : 'Jugador creado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };
  const openEdit = (j: any) => {
    setForm({
      nombre: j.nombre,
      apellido: j.apellido,
      dni: j.dni,
      fecha_nacimiento: j.fecha_nacimiento,
      equipo_id: j.equipo_id,
      telefono: j.telefono || '',
      direccion: j.direccion || '',
      estado: j.estado,
    });
    setEditingId(j.id);
    setDialogOpen(true);
  };

  const filtered = jugadores.filter((j: any) => {
    const matchSearch = `${j.nombre} ${j.apellido} ${j.dni}`.toLowerCase().includes(search.toLowerCase());
    const matchEquipo = filterEquipo === 'all' || j.equipo_id === filterEquipo;
    const matchCategoria = filterCategoria === 'all' || j.categoria_id === filterCategoria;
    return matchSearch && matchEquipo && matchCategoria;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o DNI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {(isAdmin || role === 'delegado') && (
            <Button onClick={openCreate} className="shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Jugador
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterEquipo} onValueChange={setFilterEquipo}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Equipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {equipos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre_categoria}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterEquipo !== 'all' || filterCategoria !== 'all') && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterEquipo('all'); setFilterCategoria('all'); }}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{filtered.length} jugador{filtered.length !== 1 ? 'es' : ''}</p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No se encontraron jugadores</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apellido y Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">DNI</TableHead>
                  <TableHead className="hidden md:table-cell">Equipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Categoría</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha Nac.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((j: any) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.apellido}, {j.nombre}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{j.dni}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{j.equipo?.nombre_equipo || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{j.categoria?.nombre_categoria || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {j.fecha_nacimiento ? new Date(j.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoColors[j.estado] || ''}>
                        {estadoLabels[j.estado] || j.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(j)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Jugador' : 'Nuevo Jugador'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los datos del jugador.' : 'Completá los datos para registrar un nuevo jugador.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input id="apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dni">DNI *</Label>
              <Input id="dni" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} maxLength={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
              <Input id="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select value={form.equipo_id || 'none'} onValueChange={(v) => setForm({ ...form, equipo_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Sin equipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin equipo</SelectItem>
                  {equipos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_habilitado">No habilitado</SelectItem>
                  <SelectItem value="habilitado">Habilitado</SelectItem>
                  <SelectItem value="expulsado">Expulsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">La categoría se asigna automáticamente según la fecha de nacimiento.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.nombre.trim() || !form.apellido.trim() || !form.dni.trim() || !form.fecha_nacimiento || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
