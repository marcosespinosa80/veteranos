import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeftRight } from 'lucide-react';

interface Props {
  partido: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function EditarPartidoDialog({ partido, open, onOpenChange, onSaved }: Props) {
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('');
  const [canchaId, setCanchaId] = useState<string>('');
  const [canchaTexto, setCanchaTexto] = useState('');
  const [arbitroId, setArbitroId] = useState<string>('');
  const [estado, setEstado] = useState('programado');
  const [localId, setLocalId] = useState<string>('');
  const [visitanteId, setVisitanteId] = useState<string>('');

  const { data: canchas = [] } = useQuery({
    queryKey: ['canchas-all'],
    queryFn: async () => {
      const { data } = await supabase.from('canchas').select('id, nombre').order('nombre');
      return data || [];
    },
  });

  const { data: arbitros = [] } = useQuery({
    queryKey: ['arbitros-all'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'arbitro');
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, nombre, apellido')
        .in('id', ids);
      return data || [];
    },
  });

  useEffect(() => {
    if (!partido) return;
    setDia(partido.dia || '');
    setHora(partido.hora ? String(partido.hora).slice(0, 5) : '');
    setCanchaId(partido.cancha_id || '');
    setCanchaTexto(partido.cancha_texto || '');
    setArbitroId(partido.arbitro_user_id || '');
    setEstado(partido.estado || 'programado');
    setLocalId(partido.equipo_local_id || '');
    setVisitanteId(partido.equipo_visitante_id || '');
  }, [partido]);

  const invertir = () => {
    const a = localId;
    setLocalId(visitanteId);
    setVisitanteId(a);
  };

  const guardar = async () => {
    if (!partido) return;
    const payload: any = {
      dia: dia || null,
      hora: hora || null,
      cancha_id: canchaId || null,
      cancha_texto: canchaTexto || null,
      arbitro_user_id: arbitroId || null,
      estado,
      equipo_local_id: localId || null,
      equipo_visitante_id: visitanteId || null,
    };
    const { error } = await supabase.from('partidos').update(payload).eq('id', partido.id);
    if (error) return toast.error(error.message);
    toast.success('Partido actualizado');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar partido</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Día</Label>
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div>
            <Label>Hora</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <Label>Local</Label>
              <Input value={partido?.local?.nombre_equipo || ''} disabled />
            </div>
            <Button variant="outline" size="icon" onClick={invertir} title="Invertir local/visitante">
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <Label>Visitante</Label>
              <Input value={partido?.visitante?.nombre_equipo || ''} disabled />
            </div>
          </div>
          <p className="col-span-2 text-xs text-muted-foreground -mt-2">El botón invierte la localía al guardar.</p>

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
          <div className="col-span-2">
            <Label>Cancha (texto libre)</Label>
            <Input value={canchaTexto} onChange={(e) => setCanchaTexto(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="col-span-2">
            <Label>Árbitro</Label>
            <Select value={arbitroId || '__none__'} onValueChange={(v) => setArbitroId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin árbitro —</SelectItem>
                {arbitros.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.apellido} {a.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="programado">Programado</SelectItem>
                <SelectItem value="suspendido">Suspendido</SelectItem>
                <SelectItem value="jugado">Jugado</SelectItem>
                <SelectItem value="cargado">Cargado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
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
