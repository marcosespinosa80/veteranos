import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Search, Shield, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EquipoForm {
  nombre_equipo: string;
  cancha: string;
  estado: 'activo' | 'inactivo';
  delegado_1: string | null;
  delegado_2: string | null;
}

const emptyForm: EquipoForm = { nombre_equipo: '', cancha: '', estado: 'activo', delegado_1: null, delegado_2: null };

export default function Equipos() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipoForm>(emptyForm);
  const isAdmin = role === 'admin_general' || role === 'admin_comun';

  const { data: equipos = [], isLoading } = useQuery({
    queryKey: ['equipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos')
        .select('*, delegado1:profiles!equipos_delegado_1_fkey(nombre, apellido), delegado2:profiles!equipos_delegado_2_fkey(nombre, apellido)')
        .order('nombre_equipo');
      if (error) throw error;
      return data;
    },
  });

  const { data: delegados = [] } = useQuery({
    queryKey: ['delegados'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, apellido')
        .eq('activo', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: jugadorCounts = {} } = useQuery({
    queryKey: ['jugador-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jugadores')
        .select('equipo_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((j) => {
        if (j.equipo_id) counts[j.equipo_id] = (counts[j.equipo_id] || 0) + 1;
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: EquipoForm & { id?: string }) => {
      const payload = {
        nombre_equipo: data.nombre_equipo.trim(),
        cancha: data.cancha.trim() || null,
        estado: data.estado,
        delegado_1: data.delegado_1 || null,
        delegado_2: data.delegado_2 || null,
      };
      if (data.id) {
        const { error } = await supabase.from('equipos').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('equipos').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? 'Equipo actualizado' : 'Equipo creado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };
  const openEdit = (eq: any) => {
    setForm({
      nombre_equipo: eq.nombre_equipo,
      cancha: eq.cancha || '',
      estado: eq.estado,
      delegado_1: eq.delegado_1,
      delegado_2: eq.delegado_2,
    });
    setEditingId(eq.id);
    setDialogOpen(true);
  };

  const filtered = equipos.filter((e: any) =>
    e.nombre_equipo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Nuevo Equipo
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No se encontraron equipos</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="hidden md:table-cell">Cancha</TableHead>
                  <TableHead className="hidden sm:table-cell">Delegado 1</TableHead>
                  <TableHead className="hidden lg:table-cell">Delegado 2</TableHead>
                  <TableHead className="text-center">Jugadores</TableHead>
                  <TableHead>Estado</TableHead>
                  {isAdmin && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((eq: any) => (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary shrink-0" />
                        {eq.nombre_equipo}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {eq.cancha || '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {eq.delegado1 ? `${eq.delegado1.nombre} ${eq.delegado1.apellido}` : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {eq.delegado2 ? `${eq.delegado2.nombre} ${eq.delegado2.apellido}` : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {jugadorCounts[eq.id] || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={eq.estado === 'activo' ? 'default' : 'secondary'} className={eq.estado === 'activo' ? 'bg-primary/15 text-primary border-primary/30' : ''}>
                        {eq.estado}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(eq)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los datos del equipo.' : 'Completá los datos para crear un nuevo equipo.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_equipo">Nombre del Equipo *</Label>
              <Input id="nombre_equipo" value={form.nombre_equipo} onChange={(e) => setForm({ ...form, nombre_equipo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancha">Cancha</Label>
              <Input id="cancha" value={form.cancha} onChange={(e) => setForm({ ...form, cancha: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Delegado 1</Label>
              <Select value={form.delegado_1 || 'none'} onValueChange={(v) => setForm({ ...form, delegado_1: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {delegados.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nombre} {d.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delegado 2</Label>
              <Select value={form.delegado_2 || 'none'} onValueChange={(v) => setForm({ ...form, delegado_2: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {delegados.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nombre} {d.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as 'activo' | 'inactivo' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.nombre_equipo.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
