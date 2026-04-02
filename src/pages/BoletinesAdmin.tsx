import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BoletinForm {
  titulo: string;
  categoria_id: string;
  temporada: number;
  fecha_publicacion: string;
}

const emptyForm: BoletinForm = {
  titulo: '',
  categoria_id: '',
  temporada: 2026,
  fecha_publicacion: new Date().toISOString().slice(0, 10),
};

export default function BoletinesAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BoletinForm>(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('id, nombre_categoria').order('nombre_categoria');
      if (error) throw error;
      return data;
    },
  });

  const { data: boletines = [], isLoading } = useQuery({
    queryKey: ['boletines-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boletines_publicos')
        .select('*, categoria:categorias(nombre_categoria)')
        .order('fecha_publicacion', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: BoletinForm & { id?: string }) => {
      let archivo_url: string | null = null;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('boletines').upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('boletines').getPublicUrl(path);
        archivo_url = urlData.publicUrl;
      }

      const payload: any = {
        titulo: data.titulo.trim(),
        categoria_id: data.categoria_id,
        temporada: data.temporada,
        fecha_publicacion: data.fecha_publicacion,
      };
      if (archivo_url) payload.archivo_url = archivo_url;

      if (data.id) {
        const { error } = await supabase.from('boletines_publicos').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        payload.creado_por = user!.id;
        const { error } = await supabase.from('boletines_publicos').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletines-admin'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setFile(null);
      toast({ title: editingId ? 'Boletín actualizado' : 'Boletín creado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boletines_publicos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletines-admin'] });
      toast({ title: 'Boletín eliminado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setFile(null); setDialogOpen(true); };
  const openEdit = (b: any) => {
    setForm({ titulo: b.titulo, categoria_id: b.categoria_id, temporada: b.temporada, fecha_publicacion: b.fecha_publicacion });
    setEditingId(b.id);
    setFile(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{boletines.length} boletín{boletines.length !== 1 ? 'es' : ''}</p>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nuevo Boletín</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : boletines.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No hay boletines</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Temp.</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {boletines.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        {b.titulo}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{b.categoria?.nombre_categoria}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {new Date(b.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{b.temporada}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm('¿Eliminar este boletín?')) deleteMutation.mutate(b.id); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Boletín' : 'Nuevo Boletín'}</DialogTitle>
            <DialogDescription>{editingId ? 'Modificá los datos del boletín.' : 'Completá los datos para publicar un nuevo boletín.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre_categoria}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temporada</Label>
                <Input type="number" value={form.temporada} onChange={(e) => setForm({ ...form, temporada: parseInt(e.target.value) || 2026 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Publicación</Label>
              <Input type="date" value={form.fecha_publicacion} onChange={(e) => setForm({ ...form, fecha_publicacion: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Archivo (PDF/Imagen)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.titulo.trim() || !form.categoria_id || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
