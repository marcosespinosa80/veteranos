import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trophy, Calendar } from 'lucide-react';

export default function Torneos() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: temporadas = [] } = useQuery({
    queryKey: ['torneo-temporadas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('temporadas').select('*').order('anio', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !loading && !!user,
  });

  const { data: torneos = [] } = useQuery({
    queryKey: ['torneo-list', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('torneos')
        .select('*, temporadas(anio), torneo_categorias(id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !loading && !!user,
  });

  // ---- nueva temporada ----
  const [openTemp, setOpenTemp] = useState(false);
  const [anio, setAnio] = useState<string>(String(new Date().getFullYear()));
  const crearTemporada = async () => {
    const a = parseInt(anio);
    if (!a || a < 2020) return toast.error('Año inválido');
    const { error } = await supabase.from('temporadas').insert({ anio: a });
    if (error) return toast.error(error.message);
    toast.success(`Temporada ${a} creada`);
    setOpenTemp(false);
    qc.invalidateQueries({ queryKey: ['torneo-temporadas'] });
  };

  // ---- nuevo torneo ----
  const [openTor, setOpenTor] = useState(false);
  const [tempId, setTempId] = useState<string>('');
  const [nombreTor, setNombreTor] = useState<'Apertura' | 'Clausura'>('Apertura');
  const [refId, setRefId] = useState<string>('');

  const crearTorneo = async () => {
    if (!tempId) return toast.error('Elegí una temporada');
    const payload: any = { temporada_id: tempId, nombre: nombreTor };
    if (nombreTor === 'Clausura' && refId) payload.torneo_referencia_id = refId;
    const { data, error } = await supabase.from('torneos').insert(payload).select('id').single();
    if (error) return toast.error(error.message);
    toast.success(`${nombreTor} creado`);
    setOpenTor(false);
    qc.invalidateQueries({ queryKey: ['torneo-list'] });
    if (data?.id) navigate(`/admin/torneos/${data.id}`);
  };

  const aperturasDeTemp = (tid: string) =>
    torneos.filter((t) => t.temporada_id === tid && t.nombre === 'Apertura');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Torneos</h2>
          <p className="text-sm text-muted-foreground">Apertura y Clausura por temporada</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openTemp} onOpenChange={setOpenTemp}>
            <DialogTrigger asChild>
              <Button variant="outline"><Calendar className="w-4 h-4" /> Nueva temporada</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva temporada</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Año</Label>
                <Input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={crearTemporada}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openTor} onOpenChange={setOpenTor}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" /> Nuevo torneo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo torneo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Temporada</Label>
                  <Select value={tempId} onValueChange={setTempId}>
                    <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                    <SelectContent>
                      {temporadas.map((t) => <SelectItem key={t.id} value={t.id}>{t.anio}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={nombreTor} onValueChange={(v) => setNombreTor(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apertura">Apertura</SelectItem>
                      <SelectItem value="Clausura">Clausura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {nombreTor === 'Clausura' && tempId && (
                  <div>
                    <Label>Referencia (Apertura)</Label>
                    <Select value={refId} onValueChange={setRefId}>
                      <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        {aperturasDeTemp(tempId).map((t) => (
                          <SelectItem key={t.id} value={t.id}>Apertura {t.temporadas?.anio}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={crearTorneo}>Crear torneo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {torneos.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No hay torneos creados. Empezá creando una temporada y un torneo.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {torneos.map((t) => (
            <Link key={t.id} to={`/admin/torneos/${t.id}`}>
              <Card className="hover:border-primary transition-colors h-full">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Trophy className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{t.nombre} {t.temporadas?.anio}</CardTitle>
                    <Badge variant="outline" className="mt-1">{t.estado}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t.torneo_categorias?.length ?? 0} categoría(s) configurada(s)
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
