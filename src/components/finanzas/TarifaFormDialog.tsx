import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const TIPOS = [
  { value: 'inscripcion_jugador', label: 'Inscripción Jugador' },
  { value: 'inscripcion_equipo', label: 'Inscripción Equipo' },
  { value: 'cuota_mensual', label: 'Cuota Mensual' },
  { value: 'pase', label: 'Pase' },
  { value: 'multa', label: 'Multa' },
  { value: 'arbitraje', label: 'Arbitraje' },
  { value: 'otro', label: 'Otro' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tarifa: any | null;
}

export function TarifaFormDialog({ open, onOpenChange, tarifa }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: 'inscripcion_jugador',
    monto: '',
    estado: 'activa',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: '',
    temporada: 2026,
    descripcion: '',
  });

  useEffect(() => {
    if (tarifa) {
      setForm({
        tipo: tarifa.tipo,
        monto: String(tarifa.monto),
        estado: tarifa.estado,
        fecha_inicio: tarifa.fecha_inicio,
        fecha_fin: tarifa.fecha_fin || '',
        temporada: tarifa.temporada,
        descripcion: tarifa.descripcion || '',
      });
    } else {
      setForm({
        tipo: 'inscripcion_jugador',
        monto: '',
        estado: 'activa',
        fecha_inicio: new Date().toISOString().slice(0, 10),
        fecha_fin: '',
        temporada: 2026,
        descripcion: '',
      });
    }
  }, [tarifa, open]);

  const handleSave = async () => {
    if (!form.monto || Number(form.monto) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tipo: form.tipo,
        monto: Number(form.monto),
        estado: form.estado,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
        temporada: form.temporada,
        descripcion: form.descripcion || null,
      };

      if (tarifa) {
        // If monto changed, suggest creating new version
        if (Number(tarifa.monto) !== payload.monto) {
          // Create new tarifa + inactivate old
          const { error: e1 } = await supabase.from('tarifas').update({ estado: 'inactiva' }).eq('id', tarifa.id);
          if (e1) throw e1;
          const { error: e2 } = await supabase.from('tarifas').insert(payload);
          if (e2) throw e2;
          toast.success('Nueva versión de tarifa creada (anterior inactivada)');
        } else {
          const { error } = await supabase.from('tarifas').update(payload).eq('id', tarifa.id);
          if (error) throw error;
          toast.success('Tarifa actualizada');
        }
      } else {
        const { error } = await supabase.from('tarifas').insert(payload);
        if (error) throw error;
        toast.success('Tarifa creada');
      }
      qc.invalidateQueries({ queryKey: ['tarifas-list'] });
      qc.invalidateQueries({ queryKey: ['finanzas-kpi-tarifas'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar tarifa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tarifa ? 'Editar Tarifa' : 'Nueva Tarifa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Tarifa</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto ($)</Label>
            <Input
              type="number"
              min="0"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin (opcional)</Label>
              <Input
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temporada</Label>
              <Input
                type="number"
                value={form.temporada}
                onChange={(e) => setForm({ ...form, temporada: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción de la tarifa..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
