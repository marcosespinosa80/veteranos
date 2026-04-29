import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Props {
  partido: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function CargarResultadoDialog({ partido, open, onOpenChange, onSaved }: Props) {
  const [gl, setGl] = useState<string>('');
  const [gv, setGv] = useState<string>('');
  const [hubo, setHubo] = useState(false);
  const [pl, setPl] = useState<string>('');
  const [pv, setPv] = useState<string>('');

  useEffect(() => {
    if (!partido) return;
    setGl(partido.goles_local?.toString() ?? '');
    setGv(partido.goles_visitante?.toString() ?? '');
    setHubo(!!partido.hubo_penales);
    setPl(partido.penales_local?.toString() ?? '');
    setPv(partido.penales_visitante?.toString() ?? '');
  }, [partido]);

  const empate = gl !== '' && gv !== '' && Number(gl) === Number(gv);

  const guardar = async () => {
    if (!partido) return;
    const nGl = Number(gl), nGv = Number(gv);
    if (Number.isNaN(nGl) || Number.isNaN(nGv) || nGl < 0 || nGv < 0) {
      return toast.error('Ingresá goles válidos');
    }
    const payload: any = {
      goles_local: nGl,
      goles_visitante: nGv,
      hubo_penales: false,
      penales_local: null,
      penales_visitante: null,
      ganador_id: null,
      estado: 'cargado',
    };
    if (nGl === nGv) {
      // Empate: requiere penales
      const nPl = Number(pl), nPv = Number(pv);
      if (!hubo || Number.isNaN(nPl) || Number.isNaN(nPv) || nPl === nPv) {
        return toast.error('Empate: cargá penales con un ganador');
      }
      payload.hubo_penales = true;
      payload.penales_local = nPl;
      payload.penales_visitante = nPv;
      payload.ganador_id = nPl > nPv ? partido.equipo_local_id : partido.equipo_visitante_id;
    }
    const { error } = await supabase.from('partidos').update(payload).eq('id', partido.id);
    if (error) return toast.error(error.message);
    toast.success('Resultado cargado');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cargar resultado</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-center text-sm font-semibold">
            {partido?.local?.nombre_equipo || '—'} vs {partido?.visitante?.nombre_equipo || '—'}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Goles local</Label>
              <Input type="number" min={0} value={gl} onChange={(e) => setGl(e.target.value)} />
            </div>
            <div>
              <Label>Goles visitante</Label>
              <Input type="number" min={0} value={gv} onChange={(e) => setGv(e.target.value)} />
            </div>
          </div>
          {empate && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label>Definido por penales</Label>
                <Switch checked={hubo} onCheckedChange={setHubo} />
              </div>
              {hubo && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Penales local</Label>
                    <Input type="number" min={0} value={pl} onChange={(e) => setPl(e.target.value)} />
                  </div>
                  <div>
                    <Label>Penales visitante</Label>
                    <Input type="number" min={0} value={pv} onChange={(e) => setPv(e.target.value)} />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">No se permite empate final: el ganador por penales suma 3 puntos.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar}>Guardar resultado</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
