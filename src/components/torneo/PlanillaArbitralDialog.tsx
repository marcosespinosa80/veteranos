import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type Item = {
  jugador_id: string;
  equipo_id: string;
  nombre: string;
  goles: number;
  amarillas: number;
  rojas: number;
  expulsado: boolean;
  observaciones: string;
};

type Props = {
  partido: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

export function PlanillaArbitralDialog({ partido, open, onOpenChange, onSaved }: Props) {
  const [obs, setObs] = useState('');
  const [items, setItems] = useState<Record<string, Item>>({});
  const [saving, setSaving] = useState(false);

  // Buscar lista de buena fe APROBADA del torneo/categoria/temporada para cada equipo
  const { data: jugadoresLBF, isLoading } = useQuery({
    queryKey: ['planilla-jugadores', partido?.id],
    enabled: !!partido && open,
    queryFn: async () => {
      // categoría/temporada
      const { data: tc } = await supabase
        .from('torneo_categorias')
        .select('categoria_id, torneos(temporadas(anio))')
        .eq('id', partido.torneo_categoria_id)
        .single();
      const categoriaId = (tc as any)?.categoria_id;
      const temporada = (tc as any)?.torneos?.temporadas?.anio;

      const equipoIds = [partido.equipo_local_id, partido.equipo_visitante_id].filter(Boolean);
      const out: Record<string, { equipo_id: string; jugador_id: string; nombre: string }[]> = {};
      for (const eqId of equipoIds) {
        const { data: lbf } = await supabase
          .from('listas_buena_fe')
          .select('id')
          .eq('equipo_id', eqId)
          .eq('categoria_id', categoriaId)
          .eq('temporada', temporada)
          .eq('estado', 'aprobada')
          .maybeSingle();
        if (lbf?.id) {
          const { data: jugs } = await supabase
            .from('lista_buena_fe_items')
            .select('jugador_id, jugadores(id, nombre, apellido)')
            .eq('lista_id', lbf.id);
          out[eqId] = (jugs || []).map((j: any) => ({
            equipo_id: eqId,
            jugador_id: j.jugador_id,
            nombre: `${j.jugadores?.apellido ?? ''}, ${j.jugadores?.nombre ?? ''}`.trim(),
          }));
        } else {
          // fallback: jugadores habilitados del club
          const { data: jugs } = await supabase
            .from('jugadores')
            .select('id, nombre, apellido')
            .eq('equipo_id', eqId)
            .eq('estado', 'habilitado');
          out[eqId] = (jugs || []).map((j: any) => ({
            equipo_id: eqId,
            jugador_id: j.id,
            nombre: `${j.apellido}, ${j.nombre}`,
          }));
        }
      }
      return out;
    },
  });

  // Cargar planilla previa si existe
  const { data: previa } = useQuery({
    queryKey: ['planilla-previa', partido?.id],
    enabled: !!partido && open,
    queryFn: async () => {
      const { data: p } = await supabase
        .from('planilla_arbitral')
        .select('id, observaciones, planilla_arbitral_items(*)')
        .eq('partido_id', partido.id)
        .maybeSingle();
      return p as any;
    },
  });

  // Inicializar items
  useEffect(() => {
    if (!open || !jugadoresLBF) return;
    const map: Record<string, Item> = {};
    Object.values(jugadoresLBF).flat().forEach((j) => {
      map[j.jugador_id] = {
        jugador_id: j.jugador_id,
        equipo_id: j.equipo_id,
        nombre: j.nombre,
        goles: 0, amarillas: 0, rojas: 0, expulsado: false, observaciones: '',
      };
    });
    if (previa?.planilla_arbitral_items) {
      previa.planilla_arbitral_items.forEach((it: any) => {
        if (map[it.jugador_id]) {
          map[it.jugador_id] = {
            ...map[it.jugador_id],
            goles: it.goles ?? 0,
            amarillas: it.amarillas ?? 0,
            rojas: it.rojas ?? 0,
            expulsado: !!it.expulsado,
            observaciones: it.observaciones ?? '',
          };
        }
      });
    }
    setItems(map);
    setObs(previa?.observaciones ?? '');
  }, [open, jugadoresLBF, previa]);

  const totales = useMemo(() => {
    const t: Record<string, number> = {};
    Object.values(items).forEach((i) => {
      t[i.equipo_id] = (t[i.equipo_id] || 0) + (Number(i.goles) || 0);
    });
    return t;
  }, [items]);

  const update = (id: string, patch: Partial<Item>) => {
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const guardar = async () => {
    if (!partido) return;
    setSaving(true);
    try {
      // 1) upsert planilla_arbitral
      let planillaId = previa?.id as string | undefined;
      if (!planillaId) {
        const { data, error } = await supabase
          .from('planilla_arbitral')
          .insert({ partido_id: partido.id, observaciones: obs })
          .select('id')
          .single();
        if (error) throw error;
        planillaId = data.id;
      } else {
        const { error } = await supabase
          .from('planilla_arbitral')
          .update({ observaciones: obs, updated_at: new Date().toISOString() })
          .eq('id', planillaId);
        if (error) throw error;
      }

      // 2) reemplazar items
      await supabase.from('planilla_arbitral_items').delete().eq('planilla_id', planillaId);
      const itemsRows = Object.values(items)
        .filter((i) => i.goles > 0 || i.amarillas > 0 || i.rojas > 0 || i.expulsado || i.observaciones)
        .map((i) => ({
          planilla_id: planillaId!,
          jugador_id: i.jugador_id,
          equipo_id: i.equipo_id,
          goles: i.goles,
          amarillas: i.amarillas,
          rojas: i.rojas,
          expulsado: i.expulsado,
          observaciones: i.observaciones || null,
        }));
      if (itemsRows.length > 0) {
        const { error } = await supabase.from('planilla_arbitral_items').insert(itemsRows);
        if (error) throw error;
      }

      // 3) reemplazar goles_jugador del partido
      await supabase.from('goles_jugador').delete().eq('partido_id', partido.id);
      const goles = Object.values(items)
        .filter((i) => i.goles > 0)
        .map((i) => ({
          partido_id: partido.id,
          jugador_id: i.jugador_id,
          equipo_id: i.equipo_id,
          cantidad: i.goles,
        }));
      if (goles.length > 0) {
        const { error } = await supabase.from('goles_jugador').insert(goles);
        if (error) throw error;
      }

      toast.success('Planilla guardada');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const equipos = jugadoresLBF ? Object.keys(jugadoresLBF) : [];
  const localId = partido?.equipo_local_id;
  const visitId = partido?.equipo_visitante_id;

  const renderTabla = (equipoId: string) => {
    const lista = Object.values(items).filter((i) => i.equipo_id === equipoId);
    if (lista.length === 0) return <p className="text-sm text-muted-foreground py-4">Sin jugadores en lista.</p>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs">
            <tr>
              <th className="px-2 py-2 text-left">Jugador</th>
              <th className="px-2 py-2 w-16">Goles</th>
              <th className="px-2 py-2 w-16">Amar.</th>
              <th className="px-2 py-2 w-16">Rojas</th>
              <th className="px-2 py-2 w-16">Exp.</th>
              <th className="px-2 py-2 text-left">Obs.</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((it) => (
              <tr key={it.jugador_id} className="border-b">
                <td className="px-2 py-1 font-medium">{it.nombre}</td>
                <td className="px-2 py-1"><Input type="number" min={0} value={it.goles} onChange={(e) => update(it.jugador_id, { goles: Number(e.target.value) })} className="h-8 w-16" /></td>
                <td className="px-2 py-1"><Input type="number" min={0} max={2} value={it.amarillas} onChange={(e) => update(it.jugador_id, { amarillas: Number(e.target.value) })} className="h-8 w-16" /></td>
                <td className="px-2 py-1"><Input type="number" min={0} max={1} value={it.rojas} onChange={(e) => update(it.jugador_id, { rojas: Number(e.target.value) })} className="h-8 w-16" /></td>
                <td className="px-2 py-1 text-center"><Checkbox checked={it.expulsado} onCheckedChange={(v) => update(it.jugador_id, { expulsado: !!v })} /></td>
                <td className="px-2 py-1"><Input value={it.observaciones} onChange={(e) => update(it.jugador_id, { observaciones: e.target.value })} className="h-8" placeholder="Opcional" /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="px-2 py-2 text-right">Total goles equipo:</td>
              <td className="px-2 py-2">{totales[equipoId] || 0}</td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planilla arbitral</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : equipos.length === 0 ? (
          <p className="text-muted-foreground">No se pudieron cargar jugadores.</p>
        ) : (
          <Tabs defaultValue={localId || equipos[0]}>
            <TabsList>
              {localId && <TabsTrigger value={localId}>Local ({totales[localId] || 0})</TabsTrigger>}
              {visitId && <TabsTrigger value={visitId}>Visitante ({totales[visitId] || 0})</TabsTrigger>}
            </TabsList>
            {localId && <TabsContent value={localId}>{renderTabla(localId)}</TabsContent>}
            {visitId && <TabsContent value={visitId}>{renderTabla(visitId)}</TabsContent>}
          </Tabs>
        )}

        <div>
          <label className="text-sm font-semibold">Observaciones del árbitro</label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="Incidentes, expulsiones, etc." />
        </div>

        <p className="text-xs text-muted-foreground">
          Los goles cargados aquí actualizan automáticamente el ranking de goleadores. El resultado final del partido se carga aparte ("Cargar resultado").
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving || isLoading}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar planilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
