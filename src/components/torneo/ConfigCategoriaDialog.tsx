import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  torneoCategoria: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function ConfigCategoriaDialog({ torneoCategoria, open, onOpenChange, onSaved }: Props) {
  const [estado, setEstado] = useState('configuracion');
  const [cantZonas, setCantZonas] = useState<string>('');
  const [minEq, setMinEq] = useState<number>(7);
  const [maxEq, setMaxEq] = useState<number>(10);
  const [porZona, setPorZona] = useState<number>(2);
  const [totalCls, setTotalCls] = useState<number>(8);

  useEffect(() => {
    if (!torneoCategoria) return;
    setEstado(torneoCategoria.estado || 'configuracion');
    setCantZonas(torneoCategoria.cantidad_zonas != null ? String(torneoCategoria.cantidad_zonas) : '');
    setMinEq(torneoCategoria.min_equipos_zona ?? 7);
    setMaxEq(torneoCategoria.max_equipos_zona ?? 10);
    const cfg = (torneoCategoria.clasificacion_config as any) || {};
    setPorZona(cfg.clasificados_por_zona ?? 2);
    setTotalCls(cfg.total_clasificados ?? 8);
  }, [torneoCategoria]);

  const guardar = async () => {
    if (!torneoCategoria) return;
    if (minEq < 2 || maxEq < minEq) return toast.error('Rango min/max inválido');
    const payload: any = {
      estado,
      cantidad_zonas: cantZonas ? Number(cantZonas) : null,
      min_equipos_zona: minEq,
      max_equipos_zona: maxEq,
      clasificacion_config: { clasificados_por_zona: porZona, total_clasificados: totalCls },
    };
    const { error } = await supabase.from('torneo_categorias').update(payload).eq('id', torneoCategoria.id);
    if (error) return toast.error(error.message);
    toast.success('Categoría actualizada');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Configurar categoría</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="configuracion">Configuración</SelectItem>
                <SelectItem value="en_curso">En curso</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
                <SelectItem value="archivada">Archivada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cantidad de zonas (opcional)</Label>
            <Input type="number" min={1} value={cantZonas} onChange={(e) => setCantZonas(e.target.value)} placeholder="Auto" />
          </div>
          <div />
          <div>
            <Label>Mín. equipos por zona</Label>
            <Input type="number" min={2} value={minEq} onChange={(e) => setMinEq(Number(e.target.value))} />
          </div>
          <div>
            <Label>Máx. equipos por zona</Label>
            <Input type="number" min={2} value={maxEq} onChange={(e) => setMaxEq(Number(e.target.value))} />
          </div>
          <div>
            <Label>Clasificados por zona</Label>
            <Input type="number" min={1} max={4} value={porZona} onChange={(e) => setPorZona(Number(e.target.value))} />
          </div>
          <div>
            <Label>Total clasificados</Label>
            <Select value={String(totalCls)} onValueChange={(v) => setTotalCls(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 (Semis)</SelectItem>
                <SelectItem value="8">8 (Cuartos)</SelectItem>
                <SelectItem value="16">16 (Octavos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
