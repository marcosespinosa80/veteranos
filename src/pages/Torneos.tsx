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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Trophy, Calendar, MoreVertical, Pencil, Archive, Trash2 } from 'lucide-react';

export default function Torneos() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: temporadas = [], refetch: refetchTemps } = useQuery({
    queryKey: ['torneo-temporadas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('temporadas').select('*').order('anio', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !loading && !!user,
  });

  const { data: torneos = [], refetch: refetchTorneos } = useQuery({
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

  // ---- nueva/editar temporada ----
  const [openTemp, setOpenTemp] = useState(false);
  const [editTemp, setEditTemp] = useState<any | null>(null);
  const [anio, setAnio] = useState<string>(String(new Date().getFullYear()));
  const [estadoTemp, setEstadoTemp] = useState<string>('activa');

  const abrirNuevaTemp = () => {
    setEditTemp(null);
    setAnio(String(new Date().getFullYear()));
    setEstadoTemp('activa');
    setOpenTemp(true);
  };
  const abrirEditarTemp = (t: any) => {
    setEditTemp(t);
    setAnio(String(t.anio));
    setEstadoTemp(t.estado);
    setOpenTemp(true);
  };

  const guardarTemporada = async () => {
    const a = parseInt(anio);
    if (!a || a < 2020) return toast.error('Año inválido');
    if (editTemp) {
      const { error } = await supabase.from('temporadas').update({ anio: a, estado: estadoTemp }).eq('id', editTemp.id);
      if (error) return toast.error(error.message);
      toast.success('Temporada actualizada');
    } else {
      const { error } = await supabase.from('temporadas').insert({ anio: a, estado: estadoTemp });
      if (error) return toast.error(error.message);
      toast.success(`Temporada ${a} creada`);
    }
    setOpenTemp(false);
    refetchTemps();
  };

  const eliminarTemporada = async (t: any) => {
    const usados = torneos.filter((x) => x.temporada_id === t.id).length;
    if (usados > 0) {
      return toast.error(`No se puede eliminar: tiene ${usados} torneo(s) asociado(s). Desactivá o cerrá la temporada.`);
    }
    const { error } = await supabase.from('temporadas').delete().eq('id', t.id);
    if (error) return toast.error(error.message);
    toast.success('Temporada eliminada');
    refetchTemps();
  };

  // ---- nuevo/editar torneo ----
  const [openTor, setOpenTor] = useState(false);
  const [editTor, setEditTor] = useState<any | null>(null);
  const [tempId, setTempId] = useState<string>('');
  const [nombreTor, setNombreTor] = useState<'Apertura' | 'Clausura'>('Apertura');
  const [estadoTor, setEstadoTor] = useState<string>('configuracion');
  const [refId, setRefId] = useState<string>('');

  const abrirNuevoTorneo = () => {
    setEditTor(null);
    setTempId('');
    setNombreTor('Apertura');
    setEstadoTor('configuracion');
    setRefId('');
    setOpenTor(true);
  };
  const abrirEditarTorneo = (t: any) => {
    setEditTor(t);
    setTempId(t.temporada_id);
    setNombreTor(t.nombre);
    setEstadoTor(t.estado);
    setRefId(t.torneo_referencia_id || '');
    setOpenTor(true);
  };

  const guardarTorneo = async () => {
    if (!tempId) return toast.error('Elegí una temporada');
    const payload: any = {
      temporada_id: tempId,
      nombre: nombreTor,
      estado: estadoTor,
      torneo_referencia_id: nombreTor === 'Clausura' && refId ? refId : null,
    };
    if (editTor) {
      const { error } = await supabase.from('torneos').update(payload).eq('id', editTor.id);
      if (error) return toast.error(error.message);
      toast.success('Torneo actualizado');
      setOpenTor(false);
      refetchTorneos();
    } else {
      const { data, error } = await supabase.from('torneos').insert(payload).select('id').single();
      if (error) return toast.error(error.message);
      toast.success(`${nombreTor} creado`);
      setOpenTor(false);
      qc.invalidateQueries({ queryKey: ['torneo-list'] });
      if (data?.id) navigate(`/admin/torneos/${data.id}`);
    }
  };

  // archivar
  const archivarTorneo = async (t: any) => {
    const { error } = await supabase.from('torneos').update({ estado: 'archivado' }).eq('id', t.id);
    if (error) return toast.error(error.message);
    toast.success('Torneo archivado');
    refetchTorneos();
  };

  // eliminar torneo: solo si no tiene categorías/partidos
  const eliminarTorneo = async (t: any) => {
    if ((t.torneo_categorias?.length ?? 0) > 0) {
      return toast.error('No se puede eliminar: tiene categorías configuradas. Archivá el torneo.');
    }
    const { count } = await supabase
      .from('partidos').select('id', { count: 'exact', head: true }).eq('torneo_id', t.id);
    if ((count ?? 0) > 0) {
      return toast.error('No se puede eliminar: tiene partidos asociados. Archivá el torneo.');
    }
    const { error } = await supabase.from('torneos').delete().eq('id', t.id);
    if (error) return toast.error(error.message);
    toast.success('Torneo eliminado');
    refetchTorneos();
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
          <Button variant="outline" onClick={abrirNuevaTemp}><Calendar className="w-4 h-4" /> Nueva temporada</Button>
          <Button onClick={abrirNuevoTorneo}><Plus className="w-4 h-4" /> Nuevo torneo</Button>
        </div>
      </div>

      {/* Temporadas */}
      {temporadas.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Temporadas</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {temporadas.map((t: any) => {
                const usados = torneos.filter((x) => x.temporada_id === t.id).length;
                return (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 border rounded-md">
                    <span className="font-semibold">{t.anio}</span>
                    <Badge variant={t.estado === 'activa' ? 'default' : 'outline'}>{t.estado}</Badge>
                    <span className="text-xs text-muted-foreground">{usados} torneo(s)</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEditarTemp(t)}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <ConfirmItem
                          label="Eliminar"
                          title={`¿Eliminar temporada ${t.anio}?`}
                          description={usados > 0
                            ? `No se puede eliminar: tiene ${usados} torneo(s). Editá la temporada y marcala como inactiva o cerrada.`
                            : 'Esta acción no se puede deshacer.'}
                          disabled={usados > 0}
                          onConfirm={() => eliminarTemporada(t)}
                          danger
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Temporada */}
      <Dialog open={openTemp} onOpenChange={setOpenTemp}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTemp ? 'Editar temporada' : 'Nueva temporada'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Año</Label>
              <Input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estadoTemp} onValueChange={setEstadoTemp}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                  <SelectItem value="cerrada">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTemp(false)}>Cancelar</Button>
            <Button onClick={guardarTemporada}>{editTemp ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Torneo */}
      <Dialog open={openTor} onOpenChange={setOpenTor}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTor ? 'Editar torneo' : 'Nuevo torneo'}</DialogTitle></DialogHeader>
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
            <div>
              <Label>Estado</Label>
              <Select value={estadoTor} onValueChange={setEstadoTor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="configuracion">Configuración</SelectItem>
                  <SelectItem value="en_curso">En curso</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {nombreTor === 'Clausura' && tempId && (
              <div>
                <Label>Referencia (Apertura)</Label>
                <Select value={refId || '__none__'} onValueChange={(v) => setRefId(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin referencia —</SelectItem>
                    {aperturasDeTemp(tempId).map((t) => (
                      <SelectItem key={t.id} value={t.id}>Apertura {t.temporadas?.anio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTor(false)}>Cancelar</Button>
            <Button onClick={guardarTorneo}>{editTor ? 'Guardar' : 'Crear torneo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {torneos.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No hay torneos creados. Empezá creando una temporada y un torneo.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {torneos.map((t) => {
            const tieneCats = (t.torneo_categorias?.length ?? 0) > 0;
            return (
              <Card key={t.id} className="hover:border-primary transition-colors h-full">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Trophy className="w-6 h-6 text-primary" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{t.nombre} {t.temporadas?.anio}</CardTitle>
                    <Badge variant="outline" className="mt-1">{t.estado}</Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/admin/torneos/${t.id}`)}>
                        <Trophy className="w-4 h-4 mr-2" /> Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => abrirEditarTorneo(t)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <ConfirmItem
                        label="Archivar"
                        icon={<Archive className="w-4 h-4 mr-2" />}
                        title="¿Archivar torneo?"
                        description="El torneo quedará archivado y no aparecerá como activo."
                        onConfirm={() => archivarTorneo(t)}
                      />
                      <DropdownMenuSeparator />
                      <ConfirmItem
                        label="Eliminar"
                        title={`¿Eliminar ${t.nombre} ${t.temporadas?.anio}?`}
                        description={tieneCats
                          ? 'No se puede eliminar: tiene categorías configuradas. Usá "Archivar".'
                          : 'Esta acción no se puede deshacer y solo procede si no hay datos asociados.'}
                        disabled={tieneCats}
                        onConfirm={() => eliminarTorneo(t)}
                        danger
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <Link to={`/admin/torneos/${t.id}`}>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t.torneo_categorias?.length ?? 0} categoría(s) configurada(s)
                    </p>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConfirmItem({
  label, title, description, onConfirm, danger, disabled, icon,
}: { label: string; title: string; description: string; onConfirm: () => void; danger?: boolean; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className={danger ? 'text-destructive focus:text-destructive' : ''}
          disabled={disabled}
        >
          {icon ?? <Trash2 className="w-4 h-4 mr-2" />}
          {label}
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
