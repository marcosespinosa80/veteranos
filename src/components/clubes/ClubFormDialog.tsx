import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';

interface EquipoForm {
  nombre_equipo: string;
  cancha: string;
  estado: 'activo' | 'inactivo';
  delegado_1: string | null;
  delegado_2: string | null;
  categorias: string[];
}

const emptyForm: EquipoForm = { nombre_equipo: '', cancha: '', estado: 'activo', delegado_1: null, delegado_2: null, categorias: [] };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  initialData?: any;
}

export function ClubFormDialog({ open, onOpenChange, editingId, initialData }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EquipoForm>(emptyForm);

  // All categories
  const { data: allCategorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('id, nombre_categoria').order('nombre_categoria');
      if (error) throw error;
      return data;
    },
  });

  // Current team categories for 2026
  const { data: equipoCategorias = [] } = useQuery({
    queryKey: ['equipo-categorias', editingId],
    enabled: !!editingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipo_categoria')
        .select('categoria_id')
        .eq('equipo_id', editingId!)
        .eq('temporada', 2026);
      if (error) throw error;
      return data.map((d) => d.categoria_id);
    },
  });

  // Jugadores for delegate selection
  const { data: jugadoresDelEquipo = [] } = useQuery({
    queryKey: ['jugadores-equipo', editingId],
    enabled: !!editingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jugadores')
        .select('id, nombre, apellido')
        .eq('equipo_id', editingId!)
        .eq('estado', 'habilitado')
        .order('apellido');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editingId && initialData) {
      setForm({
        nombre_equipo: (initialData.nombre_equipo || '').toUpperCase(),
        cancha: initialData.cancha || '',
        estado: initialData.estado,
        delegado_1: initialData.delegado_1,
        delegado_2: initialData.delegado_2,
        categorias: equipoCategorias,
      });
    } else {
      setForm(emptyForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  // Sync categorías once loaded (edit mode)
  useEffect(() => {
    if (open && editingId) {
      setForm((prev) => ({ ...prev, categorias: equipoCategorias }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoCategorias.join(',')]);

  const toggleCategoria = (catId: string) => {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(catId)
        ? prev.categorias.filter((c) => c !== catId)
        : [...prev.categorias, catId],
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nombreNorm = form.nombre_equipo.trim().toUpperCase();
      const canchaNorm = form.cancha.trim().toUpperCase() || null;

      // Check duplicate (case-insensitive), excluding self when editing
      const { data: dup, error: dupErr } = await supabase
        .from('equipos')
        .select('id, nombre_equipo')
        .ilike('nombre_equipo', nombreNorm);
      if (dupErr) throw dupErr;
      const conflict = (dup || []).find((e) => e.id !== editingId);
      if (conflict) throw new Error('Ya existe un club con ese nombre');

      const payload = {
        nombre_equipo: nombreNorm,
        cancha: canchaNorm,
        estado: form.estado,
        delegado_1: form.delegado_1 || null,
        delegado_2: form.delegado_2 || null,
      };

      let equipoId = editingId;

      if (editingId) {
        const { error } = await supabase.from('equipos').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('equipos').insert(payload).select('id').single();
        if (error) {
          if (error.code === '23505') throw new Error('Ya existe un club con ese nombre');
          throw error;
        }
        equipoId = data.id;
      }

      // Sync equipo_categoria for 2026
      // Delete all existing for this team+temporada
      const { error: delErr } = await supabase
        .from('equipo_categoria')
        .delete()
        .eq('equipo_id', equipoId!)
        .eq('temporada', 2026);
      if (delErr) throw delErr;

      // Insert selected
      if (form.categorias.length > 0) {
        const rows = form.categorias.map((catId) => ({
          equipo_id: equipoId!,
          categoria_id: catId,
          temporada: 2026,
        }));
        const { error: insErr } = await supabase.from('equipo_categoria').insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['equipo-categorias-all'] });
      queryClient.invalidateQueries({ queryKey: ['equipo-categorias'] });
      queryClient.invalidateQueries({ queryKey: ['jugadores'] });
      onOpenChange(false);
      toast({ title: editingId ? 'Club actualizado' : 'Club creado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const availableForDelegado1 = jugadoresDelEquipo.filter((j) => j.id !== form.delegado_2);
  const availableForDelegado2 = jugadoresDelEquipo.filter((j) => j.id !== form.delegado_1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Club' : 'Nuevo Club'}</DialogTitle>
          <DialogDescription>
            {editingId ? 'Modificá los datos del club.' : 'Completá los datos para crear un nuevo club.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_equipo">Nombre del Club *</Label>
            <Input
              id="nombre_equipo"
              value={form.nombre_equipo}
              onChange={(e) => setForm({ ...form, nombre_equipo: e.target.value.toUpperCase() })}
              placeholder="EJ: ATLÉTICO CATAMARCA"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancha">Cancha / Ubicación</Label>
            <Input
              id="cancha"
              value={form.cancha}
              onChange={(e) => setForm({ ...form, cancha: e.target.value.toUpperCase() })}
            />
          </div>

          {/* Delegados */}
          {editingId ? (
            <>
              <div className="space-y-2">
                <Label>Delegado Titular</Label>
                {jugadoresDelEquipo.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay jugadores habilitados en este club.</p>
                ) : (
                  <Select value={form.delegado_1 || 'none'} onValueChange={(v) => setForm({ ...form, delegado_1: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {availableForDelegado1.map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.apellido}, {j.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Delegado Suplente</Label>
                {jugadoresDelEquipo.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay jugadores habilitados en este club.</p>
                ) : (
                  <Select value={form.delegado_2 || 'none'} onValueChange={(v) => setForm({ ...form, delegado_2: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {availableForDelegado2.map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.apellido}, {j.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Los delegados se asignan después de crear el club.</p>
          )}

          {/* Estado */}
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

          {/* Categorías participantes */}
          <div className="space-y-2">
            <Label>Categorías Participantes (2026)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {allCategorias.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                  <Checkbox
                    checked={form.categorias.includes(cat.id)}
                    onCheckedChange={() => toggleCategoria(cat.id)}
                  />
                  {cat.nombre_categoria}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!form.nombre_equipo.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
