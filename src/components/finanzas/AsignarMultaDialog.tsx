import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DniInput } from '@/components/ui/dni-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Gavel } from 'lucide-react';
import { toast } from 'sonner';

export function AsignarMultaDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetType, setTargetType] = useState<'jugador' | 'equipo'>('jugador');
  const [searchDni, setSearchDni] = useState('');
  const [selectedEquipoId, setSelectedEquipoId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Get active multa tariff
  const { data: tarifaMulta } = useQuery({
    queryKey: ['tarifa-multa-activa'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tarifas')
        .select('monto')
        .eq('tipo', 'multa')
        .eq('estado', 'activa')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Search jugador
  const { data: jugadorFound } = useQuery({
    queryKey: ['multa-buscar-jugador', searchDni],
    enabled: targetType === 'jugador' && searchDni.length >= 6,
    queryFn: async () => {
      const dniClean = searchDni.replace(/\./g, '');
      const { data } = await supabase
        .from('jugadores')
        .select('id, nombre, apellido, dni, equipo_id')
        .or(`dni.eq.${dniClean},dni.ilike.%${dniClean}%`)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: equipos = [] } = useQuery({
    queryKey: ['multa-equipos'],
    enabled: targetType === 'equipo',
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

  useEffect(() => {
    if (open && tarifaMulta) {
      setMonto(String(tarifaMulta.monto));
    }
  }, [open, tarifaMulta]);

  useEffect(() => {
    if (!open) {
      setSearchDni('');
      setSelectedEquipoId('');
      setMonto('');
      setDescripcion('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    const jugadorId = targetType === 'jugador' ? jugadorFound?.id : null;
    const equipoId = targetType === 'equipo' ? selectedEquipoId : jugadorFound?.equipo_id || null;

    if (targetType === 'jugador' && !jugadorId) {
      toast.error('Seleccione un jugador válido');
      return;
    }
    if (targetType === 'equipo' && !equipoId) {
      toast.error('Seleccione un club');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('cargos').insert({
        tipo: 'multa',
        monto: Number(monto),
        jugador_id: jugadorId,
        equipo_id: equipoId,
        descripcion: descripcion || null,
        created_by: user!.id,
      });
      if (error) throw error;
      toast.success('Multa asignada correctamente');
      qc.invalidateQueries({ queryKey: ['finanzas-kpi-deuda'] });
      qc.invalidateQueries({ queryKey: ['deudas'] });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al asignar multa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Gavel className="w-4 h-4 mr-2" /> Asignar Multa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Multa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Multa para</Label>
            <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as any)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jugador" id="m-jugador" />
                <Label htmlFor="m-jugador">Jugador</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equipo" id="m-equipo" />
                <Label htmlFor="m-equipo">Club</Label>
              </div>
            </RadioGroup>
          </div>

          {targetType === 'jugador' ? (
            <div className="space-y-2">
              <Label>Buscar por DNI</Label>
              <Input placeholder="Ej: 30123456" value={searchDni} onChange={(e) => setSearchDni(e.target.value)} />
              {jugadorFound && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ {jugadorFound.apellido}, {jugadorFound.nombre}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Club</Label>
              <Select value={selectedEquipoId} onValueChange={setSelectedEquipoId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar club..." /></SelectTrigger>
                <SelectContent>
                  {equipos.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Monto ($)</Label>
            <Input type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} />
            {tarifaMulta && (
              <p className="text-xs text-muted-foreground">Tarifa multa activa: ${tarifaMulta.monto}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Motivo / Descripción</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Motivo de la multa..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSave} disabled={saving}>
            {saving ? 'Asignando...' : 'Asignar Multa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
