import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DniInput } from '@/components/ui/dni-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const TIPO_LABELS: Record<string, string> = {
  inscripcion_jugador: 'Inscripción Jugador',
  inscripcion_equipo: 'Inscripción Equipo',
  cuota_mensual: 'Cuota Mensual',
  pase: 'Pase',
  multa: 'Multa',
  arbitraje: 'Arbitraje',
  otro: 'Otro',
};

interface PreloadTarget {
  type: 'jugador' | 'equipo';
  jugadorId?: string;
  jugadorDni?: string;
  equipoId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preload?: PreloadTarget | null;
}

export function RegistrarPagoDialog({ open, onOpenChange, preload }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [targetType, setTargetType] = useState<'jugador' | 'equipo'>('jugador');
  const [searchDni, setSearchDni] = useState('');
  const [preloadedJugadorId, setPreloadedJugadorId] = useState<string | null>(null);
  const [selectedEquipoId, setSelectedEquipoId] = useState('');
  const [selectedCargos, setSelectedCargos] = useState<string[]>([]);
  const [medioPago, setMedioPago] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Search jugador by DNI (normalized: ignores dots)
  const dniClean = searchDni.replace(/\D/g, '');
  const { data: jugadorFound } = useQuery({
    queryKey: ['pago-buscar-jugador', dniClean],
    enabled: targetType === 'jugador' && !preloadedJugadorId && dniClean.length >= 6,
    queryFn: async () => {
      // Fetch candidates and normalize on client to handle stored DNIs with or without dots
      const { data, error } = await supabase
        .from('jugadores')
        .select('id, nombre, apellido, dni, equipo_id')
        .or(`dni.eq.${dniClean},dni.ilike.%${dniClean}%`)
        .limit(20);
      if (error) throw error;
      const match = (data || []).find((j: any) => (j.dni || '').replace(/\D/g, '') === dniClean);
      return match || null;
    },
  });

  // Preloaded jugador info (when opened from Deudas row)
  const { data: jugadorPreloaded } = useQuery({
    queryKey: ['pago-jugador-preloaded', preloadedJugadorId],
    enabled: !!preloadedJugadorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jugadores')
        .select('id, nombre, apellido, dni, equipo_id')
        .eq('id', preloadedJugadorId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const jugadorActivo = jugadorPreloaded || jugadorFound;

  // Load equipos for select
  const { data: equipos = [] } = useQuery({
    queryKey: ['pago-equipos'],
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

  // Load cargos pendientes
  const targetId = targetType === 'jugador' ? jugadorFound?.id : selectedEquipoId;
  const { data: cargosPendientes = [] } = useQuery({
    queryKey: ['pago-cargos', targetType, targetId],
    enabled: !!targetId,
    queryFn: async () => {
      let q = supabase.from('cargos').select('*').in('estado_pago', ['pendiente', 'vencido']);
      if (targetType === 'jugador') {
        q = q.eq('jugador_id', targetId!);
      } else {
        q = q.eq('equipo_id', targetId!);
      }
      const { data, error } = await q.order('fecha_emision');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open) {
      setSearchDni('');
      setSelectedEquipoId('');
      setSelectedCargos([]);
      setMedioPago('efectivo');
      setReferencia('');
      setObservaciones('');
    } else if (preload) {
      setTargetType(preload.type);
      if (preload.type === 'jugador' && preload.jugadorDni) {
        setSearchDni(preload.jugadorDni);
      }
      if (preload.type === 'equipo' && preload.equipoId) {
        setSelectedEquipoId(preload.equipoId);
      }
    }
  }, [open, preload]);

  // Auto-select all pending cargos (payment is total, no partial)
  useEffect(() => {
    if (cargosPendientes.length > 0) {
      setSelectedCargos(cargosPendientes.map((c: any) => c.id));
    }
  }, [cargosPendientes]);

  const totalSelected = cargosPendientes
    .filter((c: any) => selectedCargos.includes(c.id))
    .reduce((sum: number, c: any) => sum + Number(c.monto), 0);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  const handleSave = async () => {
    if (selectedCargos.length === 0) {
      toast.error('Seleccione al menos un cargo a pagar');
      return;
    }
    setSaving(true);
    try {
      // Create pago
      const { data: pago, error: pagoErr } = await supabase
        .from('pagos')
        .insert({
          monto_total: totalSelected,
          medio_pago: medioPago,
          referencia: referencia || null,
          observaciones: observaciones || null,
          registrado_por: user!.id,
        })
        .select('id')
        .single();
      if (pagoErr) throw pagoErr;

      // Create pago_items
      const items = cargosPendientes
        .filter((c: any) => selectedCargos.includes(c.id))
        .map((c: any) => ({
          pago_id: pago.id,
          cargo_id: c.id,
          monto_aplicado: Number(c.monto),
        }));

      const { error: itemsErr } = await supabase.from('pago_items').insert(items);
      if (itemsErr) throw itemsErr;

      // Mark cargos as paid
      const { error: updateErr } = await supabase
        .from('cargos')
        .update({ estado_pago: 'pagado' })
        .in('id', selectedCargos);
      if (updateErr) throw updateErr;

      toast.success('Pago registrado correctamente');
      qc.invalidateQueries({ queryKey: ['pagos-list'] });
      qc.invalidateQueries({ queryKey: ['finanzas-kpi'] });
      qc.invalidateQueries({ queryKey: ['finanzas-kpi-recaudado'] });
      qc.invalidateQueries({ queryKey: ['finanzas-kpi-deuda'] });
      qc.invalidateQueries({ queryKey: ['deudas'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Target type */}
          <div className="space-y-2">
            <Label>Pago para</Label>
            <RadioGroup
              value={targetType}
              onValueChange={(v) => {
                setTargetType(v as any);
                setSelectedCargos([]);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jugador" id="t-jugador" />
                <Label htmlFor="t-jugador">Jugador</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equipo" id="t-equipo" />
                <Label htmlFor="t-equipo">Club</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Search */}
          {targetType === 'jugador' ? (
            <div className="space-y-2">
              <Label>Buscar por DNI</Label>
              <DniInput
                placeholder="28.404.402"
                value={searchDni}
                onChange={(v) => setSearchDni(v)}
              />
              {jugadorFound && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ {jugadorFound.apellido}, {jugadorFound.nombre} — DNI: {jugadorFound.dni}
                </p>
              )}
              {searchDni.length >= 6 && !jugadorFound && (
                <p className="text-sm text-muted-foreground">No se encontró jugador con ese DNI.</p>
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

          {/* Cargos pendientes */}
          {targetId && cargosPendientes.length > 0 && (
            <div className="space-y-2">
              <Label>Cargos Pendientes</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {cargosPendientes.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedCargos.includes(c.id)}
                      onCheckedChange={(checked) => {
                        setSelectedCargos((prev) =>
                          checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                        );
                      }}
                    />
                    <span className="text-sm flex-1">
                      {TIPO_LABELS[c.tipo] || c.tipo}
                      {c.descripcion ? ` — ${c.descripcion}` : ''}
                    </span>
                    <span className="text-sm font-medium">{formatMoney(Number(c.monto))}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold">Total a pagar: {formatMoney(totalSelected)}</p>
            </div>
          )}

          {targetId && cargosPendientes.length === 0 && (
            <p className="text-sm text-green-600 text-center py-4">✓ Sin deudas pendientes</p>
          )}

          {/* Payment details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medio de Pago</Label>
              <Select value={medioPago} onValueChange={setMedioPago}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referencia / Recibo</Label>
              <Input
                placeholder="Nro. comprobante"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || selectedCargos.length === 0}>
            {saving ? 'Registrando...' : `Registrar Pago (${formatMoney(totalSelected)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
