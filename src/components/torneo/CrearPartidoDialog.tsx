import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  torneoCategoriaId: string;
  torneoId: string;
  categoriaId: string;
  zonas: any[];
  onSaved: () => void;
}

export function CrearPartidoDialog({ open, onOpenChange, torneoCategoriaId, torneoId, categoriaId, zonas, onSaved }: Props) {
  const [zonaId, setZonaId] = useState<string>('');
  const [fechaNum, setFechaNum] = useState<string>('1');
  const [localId, setLocalId] = useState<string>('');
  const [visitanteId, setVisitanteId] = useState<string>('');
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('');
  const [canchaId, setCanchaId] = useState<string>('');
  const [fase, setFase] = useState<string>('grupos');

  useEffect(() => {
    if (!open) return;
    setZonaId(''); setFechaNum('1'); setLocalId(''); setVisitanteId('');
    setDia(''); setHora(''); setCanchaId(''); setFase('grupos');
  }, [open]);

  const { data: equipos = [] } = useQuery({
    queryKey: ['crear-partido-equipos', torneoCategoriaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('torneo_equipos')
        .select('equipo_id, equipos(id, nombre_equipo)')
        .eq('torneo_categoria_id', torneoCategoriaId);
      return (data || []).map((x: any) => x.equipos).filter(Boolean);
    },
    enabled: open,
  });

  const { data: canchas = [] } = useQuery({
    queryKey: ['canchas-cp'],
    queryFn: async () => {
      const { data } = await supabase.from('canchas').select('id, nombre').order('nombre');
      return data || [];
    },
    enabled: open,
  });

  const guardar = async () => {
    if (!localId || !visitanteId) return toast.error('Elegí local y visitante');
    if (localId === visitanteId) return toast.error('Local y visitante no pueden ser el mismo');
    const payload: any = {
      torneo_id: torneoId,
      torneo_categoria_id: torneoCategoriaId,
      categoria_id: categoriaId,
      zona_id: zonaId || null,
      fase,
      fecha_numero: fase === 'grupos' ? Number(fechaNum) || null : null,
      equipo_local_id: localId,
      equipo_visitante_id: visitanteId,
      cancha_id: canchaId || null,
      dia: dia || null,
      hora: hora || null,
      estado: 'programado',
    };
    const { error } = await supabase.from('partidos').insert(payload);
    if (error) return toast.error(error.message);
    toast.success('Partido creado');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Crear partido manual</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fase</Label>
            <Select value={fase} onValueChange={setFase}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grupos">Grupos</SelectItem>
                <SelectItem value="octavos">Octavos</SelectItem>
                <SelectItem value="cuartos">Cuartos</SelectItem>
                <SelectItem value="semifinal">Semifinal</SelectItem>
                <SelectItem value="final">Final</SelectItem>
                <SelectItem value="posicionamiento">Posicionamiento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fase === 'grupos' && (
            <>
              <div>
                <Label>N° Fecha</Label>
                <Input type="number" min={1} value={fechaNum} onChange={(e) => setFechaNum(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Zona</Label>
                <Select value={zonaId || '__none__'} onValueChange={(v) => setZonaId(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Sin zona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin zona —</SelectItem>
                    {zonas.map((z: any) => <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label>Local</Label>
            <Select value={localId} onValueChange={setLocalId}>
              <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
              <SelectContent>
                {equipos.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visitante</Label>
            <Select value={visitanteId} onValueChange={setVisitanteId}>
              <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
              <SelectContent>
                {equipos.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Día</Label>
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div>
            <Label>Hora</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Cancha</Label>
            <Select value={canchaId || '__none__'} onValueChange={(v) => setCanchaId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin cancha —</SelectItem>
                {canchas.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar}>Crear partido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
