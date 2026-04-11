import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Plus, Pencil, Trash2, MapPin, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type EstadoCancha = 'disponible' | 'mantenimiento' | 'no_disponible';

interface CanchaRow {
  id: string;
  nombre: string;
  direccion: string | null;
  club_asignado_id: string | null;
  google_maps_url: string | null;
  estado: string;
  equipos?: { nombre_equipo: string } | null;
}

interface CanchaForm {
  nombre: string;
  direccion: string;
  club_asignado_id: string | null;
  google_maps_url: string;
  estado: EstadoCancha;
}

const emptyForm: CanchaForm = {
  nombre: '',
  direccion: '',
  club_asignado_id: null,
  google_maps_url: '',
  estado: 'disponible',
};

const ESTADO_ORDER: Record<string, number> = { disponible: 0, mantenimiento: 1, no_disponible: 2 };

const estadoLabel: Record<string, string> = {
  disponible: 'Disponible',
  mantenimiento: 'En mantenimiento',
  no_disponible: 'No disponible',
};

const estadoBadgeClass: Record<string, string> = {
  disponible: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  mantenimiento: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  no_disponible: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function Canchas() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin_general' || role === 'admin_comun';

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CanchaForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch canchas
  const { data: canchas = [], isLoading } = useQuery({
    queryKey: ['canchas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canchas')
        .select('*, equipos:club_asignado_id(nombre_equipo)')
        .order('nombre');
      if (error) throw error;
      return (data as unknown as CanchaRow[]).sort((a, b) => {
        const oa = ESTADO_ORDER[a.estado] ?? 9;
        const ob = ESTADO_ORDER[b.estado] ?? 9;
        if (oa !== ob) return oa - ob;
        return a.nombre.localeCompare(b.nombre);
      });
    },
  });

  // Fetch equipos for select
  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos')
        .select('id, nombre_equipo')
        .eq('estado', 'activo')
        .order('nombre_equipo');
      if (error) throw error;
      return data;
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim() || null,
        club_asignado_id: form.club_asignado_id,
        google_maps_url: form.google_maps_url.trim() || null,
        estado: form.estado,
      };
      if (editingId) {
        const { error } = await supabase.from('canchas').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('canchas').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canchas'] });
      toast({ title: editingId ? 'Cancha actualizada' : 'Cancha creada' });
      closeDialog();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('canchas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canchas'] });
      toast({ title: 'Cancha eliminada' });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (c: CanchaRow) => {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre,
      direccion: c.direccion || '',
      club_asignado_id: c.club_asignado_id,
      google_maps_url: c.google_maps_url || '',
      estado: c.estado as EstadoCancha,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nombre.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    if (form.google_maps_url.trim() && !/^https?:\/\//i.test(form.google_maps_url.trim())) {
      toast({ title: 'El link de Google Maps debe empezar con http:// o https://', variant: 'destructive' });
      return;
    }
    saveMutation.mutate();
  };

  const filtered = canchas.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.equipos?.nombre_equipo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Canchas</h2>
          <p className="text-sm text-muted-foreground">Canchas habilitadas</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Nueva Cancha
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o club…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No se encontraron canchas</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cancha / Predio</TableHead>
                <TableHead>Club asignado</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Mapa</TableHead>
                {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>{c.equipos?.nombre_equipo || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.direccion || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={estadoBadgeClass[c.estado] || ''}>
                      {estadoLabel[c.estado] || c.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {c.google_maps_url ? (
                      <a href={c.google_maps_url} target="_blank" rel="noopener noreferrer">
                        <MapPin className="w-4 h-4 inline text-primary hover:scale-110 transition-transform" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: Nueva / Editar Cancha */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Cancha' : 'Nueva Cancha'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los datos de la cancha.' : 'Completá los datos para registrar una nueva cancha.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Predio / Cancha *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Complejo El Sauce – Cancha 1"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección / Referencia</Label>
              <Input
                id="direccion"
                placeholder="Calle, Altura, Localidad…"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              />
            </div>

            {/* Club asignado */}
            <div className="space-y-2">
              <Label>Club Asignado (Opcional)</Label>
              <Select
                value={form.club_asignado_id || 'none'}
                onValueChange={(v) => setForm({ ...form, club_asignado_id: v === 'none' ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {equipos.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.nombre_equipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Google Maps */}
            <div className="space-y-2">
              <Label htmlFor="maps">Link de Google Maps (Opcional)</Label>
              <div className="flex gap-2">
                <Input
                  id="maps"
                  placeholder="https://maps.google.com/…"
                  value={form.google_maps_url}
                  onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })}
                  className="flex-1"
                />
                {form.google_maps_url.trim() && /^https?:\/\//i.test(form.google_maps_url.trim()) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a href={form.google_maps_url.trim()} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label>Estado de la Cancha</Label>
              <Select
                value={form.estado}
                onValueChange={(v) => setForm({ ...form, estado: v as EstadoCancha })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="mantenimiento">En mantenimiento</SelectItem>
                  <SelectItem value="no_disponible">No disponible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cancha?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
