import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DniInput } from '@/components/ui/dni-input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Search, ArrowRightLeft, CheckCircle, XCircle, AlertCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const estadoColors: Record<string, string> = {
  iniciado: 'bg-muted text-muted-foreground',
  pendiente_firmas: 'bg-warning/15 text-warning border-warning/30',
  revision_liga: 'bg-secondary/15 text-secondary-foreground border-secondary/30',
  observado: 'bg-destructive/15 text-destructive border-destructive/30',
  rechazado: 'bg-destructive/15 text-destructive border-destructive/30',
  aprobado: 'bg-primary/15 text-primary border-primary/30',
  pendiente_pago: 'bg-warning/15 text-warning border-warning/30',
  habilitado: 'bg-primary/15 text-primary border-primary/30',
};

const estadoLabels: Record<string, string> = {
  iniciado: 'Iniciado',
  pendiente_firmas: 'Pendiente Firmas',
  revision_liga: 'Revisión Liga',
  observado: 'Observado',
  rechazado: 'Rechazado',
  aprobado: 'Aprobado',
  pendiente_pago: 'Pendiente Pago',
  habilitado: 'Habilitado',
};

export default function Pases() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPase, setSelectedPase] = useState<any>(null);
  const [createForm, setCreateForm] = useState({
    club_origen_id: '', club_destino_id: '', dni: '',
  });
  const [jugadorEncontrado, setJugadorEncontrado] = useState<any>(null);
  const [searchError, setSearchError] = useState<string>('');
  const [montoRegistro, setMontoRegistro] = useState('');
  const isAdmin = role === 'admin_general' || role === 'admin_comun';

  const { data: pases = [], isLoading } = useQuery({
    queryKey: ['pases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pases')
        .select('*, jugador:jugadores(nombre, apellido, dni), club_origen:equipos!pases_club_origen_id_fkey(nombre_equipo), club_destino:equipos!pases_club_destino_id_fkey(nombre_equipo), iniciador:profiles!pases_iniciado_por_fkey(nombre, apellido)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipos').select('id, nombre_equipo').eq('estado', 'activo').order('nombre_equipo');
      if (error) throw error;
      return data;
    },
  });

  // Tarifa de pase activa vigente
  const { data: tarifaPase } = useQuery({
    queryKey: ['tarifa-pase-activa'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('tarifas')
        .select('*')
        .eq('tipo', 'pase')
        .eq('estado', 'activa')
        .lte('fecha_inicio', today)
        .or(`fecha_fin.is.null,fecha_fin.gte.${today}`)
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const normalizeDni = (dni: string) => dni.replace(/\D/g, '');

  const buscarJugador = async () => {
    setSearchError('');
    setJugadorEncontrado(null);
    setCreateForm((f) => ({ ...f, club_destino_id: '' }));
    const dniNorm = normalizeDni(createForm.dni);
    if (!dniNorm) {
      setSearchError('Ingresá un DNI');
      return;
    }
    const { data, error } = await supabase
      .from('jugadores')
      .select('id, nombre, apellido, dni, equipo_id, categoria_id, estado, suspendido_fechas, categorias(nombre_categoria), equipos!jugadores_equipo_id_fkey(nombre_equipo)')
      .or(`dni.eq.${dniNorm},dni.eq.${createForm.dni}`)
      .limit(1)
      .maybeSingle();
    if (error) {
      setSearchError(error.message);
      return;
    }
    if (!data) {
      setSearchError('Jugador no encontrado');
      return;
    }
    if (!data.equipo_id) {
      setSearchError('El jugador no tiene club asignado');
      return;
    }
    const { data: deudas } = await supabase
      .from('cargos')
      .select('id')
      .eq('jugador_id', data.id)
      .eq('estado_pago', 'pendiente');
    setJugadorEncontrado({ ...data, tiene_deuda: (deudas?.length || 0) > 0, cantidad_deudas: deudas?.length || 0 });
  };

  const getBloqueo = (): string | null => {
    if (!jugadorEncontrado) return null;
    if (jugadorEncontrado.tiene_deuda) return 'No se puede realizar el pase: el jugador tiene deuda pendiente.';
    if (jugadorEncontrado.suspendido_fechas > 0) return `No se puede realizar el pase: jugador suspendido (${jugadorEncontrado.suspendido_fechas} fechas).`;
    if (jugadorEncontrado.estado === 'expulsado') return 'No se puede realizar el pase: jugador expulsado.';
    if (jugadorEncontrado.estado !== 'habilitado') return 'No se puede realizar el pase: jugador no habilitado.';
    if (!tarifaPase) return 'No hay tarifa de pase vigente. Configure Tarifas.';
    return null;
  };

  const validarPase = (): string | null => {
    if (!jugadorEncontrado) return 'Buscá un jugador válido primero';
    const bloqueo = getBloqueo();
    if (bloqueo) return bloqueo;
    if (!createForm.club_destino_id) return 'Seleccioná el club de destino';
    if (createForm.club_destino_id === jugadorEncontrado.equipo_id) return 'El club de destino debe ser distinto al de origen';
    return null;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const err = validarPase();
      if (err) throw new Error(err);
      const monto = Number(tarifaPase!.monto);
      const { data: paseInsertado, error } = await supabase.from('pases').insert({
        jugador_id: jugadorEncontrado.id,
        club_origen_id: jugadorEncontrado.equipo_id,
        club_destino_id: createForm.club_destino_id,
        categoria_id: jugadorEncontrado.categoria_id,
        iniciado_por: user!.id,
        monto,
      }).select('id').single();
      if (error) throw error;
      // Crear cargo pendiente asociado
      const { error: cargoError } = await supabase.from('cargos').insert({
        tipo: 'pase',
        monto,
        tarifa_id: tarifaPase!.id,
        jugador_id: jugadorEncontrado.id,
        pase_id: paseInsertado.id,
        estado_pago: 'pendiente',
        descripcion: `Pase ${jugadorEncontrado.apellido}, ${jugadorEncontrado.nombre}`,
        created_by: user!.id,
      });
      if (cargoError) throw cargoError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pases'] });
      setCreateOpen(false);
      setCreateForm({ club_origen_id: '', club_destino_id: '', dni: '' });
      setJugadorEncontrado(null);
      setSearchError('');
      toast({ title: 'Pase iniciado', description: 'Se generó el cargo del pase como pendiente.' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const changeEstadoMutation = useMutation({
    mutationFn: async ({ id, estado, extra }: { id: string; estado: string; extra?: Record<string, any> }) => {
      const payload: any = { estado, ...extra };
      if (estado === 'aprobado' || estado === 'rechazado') {
        payload.revisado_por = user!.id;
        payload.fecha_aprobacion = new Date().toISOString();
      }
      if (estado === 'habilitado') {
        payload.fecha_habilitacion = new Date().toISOString();
      }
      const { error } = await supabase.from('pases').update(payload).eq('id', id);
      if (error) throw error;

      // If habilitado, move the player to the new team
      if (estado === 'habilitado') {
        const pase = pases.find((p: any) => p.id === id);
        if (pase) {
          const { error: moveError } = await supabase.from('jugadores')
            .update({ equipo_id: pase.club_destino_id })
            .eq('id', pase.jugador_id);
          if (moveError) throw moveError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pases'] });
      queryClient.invalidateQueries({ queryKey: ['jugadores'] });
      setDetailOpen(false);
      setSelectedPase(null);
      toast({ title: 'Pase actualizado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const registrarPagoMutation = useMutation({
    mutationFn: async ({ id, monto }: { id: string; monto: number }) => {
      const { error } = await supabase.from('pases').update({
        pago_registrado: true,
        monto,
        estado: 'habilitado',
        fecha_habilitacion: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;

      // Move player
      const pase = pases.find((p: any) => p.id === id);
      if (pase) {
        await supabase.from('jugadores')
          .update({ equipo_id: pase.club_destino_id })
          .eq('id', pase.jugador_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pases'] });
      queryClient.invalidateQueries({ queryKey: ['jugadores'] });
      setDetailOpen(false);
      setSelectedPase(null);
      setMontoRegistro('');
      toast({ title: 'Pago registrado y jugador habilitado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const openDetail = (pase: any) => {
    setSelectedPase(pase);
    setDetailOpen(true);
    setMontoRegistro(pase.monto?.toString() || '');
  };

  const filtered = pases.filter((p: any) => {
    const searchStr = `${p.jugador?.nombre} ${p.jugador?.apellido} ${p.jugador?.dni} ${p.club_origen?.nombre_equipo} ${p.club_destino?.nombre_equipo}`.toLowerCase();
    const matchSearch = searchStr.includes(search.toLowerCase());
    const matchEstado = filterEstado === 'all' || p.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const clubDestinoOptions = equipos.filter(e => e.id !== jugadorEncontrado?.equipo_id);
  const bloqueoMsg = getBloqueo();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar jugador o equipo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Nuevo Pase
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(estadoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} pase{filtered.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No se encontraron pases</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead className="hidden sm:table-cell">Origen → Destino</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="hidden lg:table-cell">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-primary shrink-0" />
                        {p.jugador?.apellido}, {p.jugador?.nombre}
                      </div>
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {p.club_origen?.nombre_equipo} → {p.club_destino?.nombre_equipo}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {p.club_origen?.nombre_equipo} → {p.club_destino?.nombre_equipo}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {p.monto ? `$${Number(p.monto).toLocaleString('es-AR')}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoColors[p.estado] || ''}>
                        {estadoLabels[p.estado] || p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openDetail(p)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setJugadorEncontrado(null); setSearchError(''); setCreateForm({ club_origen_id: '', club_destino_id: '', dni: '' }); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Pase</DialogTitle>
            <DialogDescription>Iniciá un pase de jugador entre clubes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 1. Buscar jugador por DNI */}
            <div className="space-y-2">
              <Label>1. Buscar Jugador por DNI *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: 26187534"
                  value={createForm.dni}
                  onChange={(e) => setCreateForm({ ...createForm, dni: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarJugador(); } }}
                />
                <Button type="button" variant="outline" onClick={buscarJugador}>
                  <Search className="w-4 h-4 mr-1" /> Buscar
                </Button>
              </div>
              {searchError && (
                <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {searchError}</p>
              )}
            </div>

            {/* 2. Datos jugador (resumen) */}
            {jugadorEncontrado && (
              <div className="rounded-md border p-3 bg-muted/30 space-y-1 text-sm">
                <p className="font-medium">{jugadorEncontrado.apellido}, {jugadorEncontrado.nombre}</p>
                <p className="text-xs text-muted-foreground">DNI: {jugadorEncontrado.dni}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="outline" className={
                    jugadorEncontrado.estado === 'habilitado' && jugadorEncontrado.suspendido_fechas === 0 ? 'bg-primary/15 text-primary border-primary/30' :
                    jugadorEncontrado.estado === 'expulsado' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                    'bg-muted text-muted-foreground'
                  }>
                    {jugadorEncontrado.suspendido_fechas > 0
                      ? `SUSPENDIDO (${jugadorEncontrado.suspendido_fechas} FECHAS)`
                      : jugadorEncontrado.estado === 'habilitado' ? 'HABILITADO'
                      : jugadorEncontrado.estado === 'expulsado' ? 'EXPULSADO'
                      : 'NO HABILITADO'}
                  </Badge>
                  {jugadorEncontrado.tiene_deuda && (
                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
                      <AlertTriangle className="w-3 h-3" /> CON DEUDA ({jugadorEncontrado.cantidad_deudas})
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Solo mostrar el resto si hay jugador */}
            {jugadorEncontrado && (
              <>
                {/* 2. Club origen (auto) */}
                <div className="space-y-2">
                  <Label>2. Club de Origen</Label>
                  <Input readOnly value={jugadorEncontrado.equipos?.nombre_equipo || '—'} className="bg-muted" />
                </div>

                {/* 3. Categoría (auto) */}
                <div className="space-y-2">
                  <Label>3. Categoría</Label>
                  <Input readOnly value={jugadorEncontrado.categorias?.nombre_categoria || '—'} className="bg-muted" />
                </div>

                {/* 4. Bloqueos */}
                {bloqueoMsg && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{bloqueoMsg}</span>
                  </div>
                )}

                {/* 5. Club destino */}
                <div className="space-y-2">
                  <Label>5. Club de Destino *</Label>
                  <Select
                    value={createForm.club_destino_id}
                    onValueChange={(v) => setCreateForm({ ...createForm, club_destino_id: v })}
                    disabled={!!bloqueoMsg}
                  >
                    <SelectTrigger><SelectValue placeholder={bloqueoMsg ? 'Bloqueado' : 'Seleccionar'} /></SelectTrigger>
                    <SelectContent>
                      {clubDestinoOptions.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. Categoría destino */}
                <div className="space-y-2">
                  <Label>6. Categoría Destino</Label>
                  <Input readOnly value={jugadorEncontrado.categorias?.nombre_categoria || '—'} className="bg-muted" />
                </div>

                {/* 7. Costo */}
                <div className="space-y-2">
                  <Label>7. Costo de Transferencia (Pase)</Label>
                  <Input readOnly value={tarifaPase ? `$${Number(tarifaPase.monto).toLocaleString('es-AR')}` : 'Sin tarifa vigente'} className="bg-muted font-medium" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!!validarPase() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : 'Iniciar Pase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalle de Pase
              {selectedPase && (
                <Badge variant="outline" className={estadoColors[selectedPase.estado] || ''}>
                  {estadoLabels[selectedPase.estado] || selectedPase.estado}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedPase && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Jugador</p>
                  <p className="font-medium">{selectedPase.jugador?.apellido}, {selectedPase.jugador?.nombre}</p>
                  <p className="text-xs text-muted-foreground">DNI: {selectedPase.jugador?.dni}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Iniciado por</p>
                  <p className="font-medium">{selectedPase.iniciador?.apellido}, {selectedPase.iniciador?.nombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Club Origen</p>
                  <p className="font-medium">{selectedPase.club_origen?.nombre_equipo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Club Destino</p>
                  <p className="font-medium">{selectedPase.club_destino?.nombre_equipo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monto</p>
                  <p className="font-medium">{selectedPase.monto ? `$${Number(selectedPase.monto).toLocaleString('es-AR')}` : 'Sin monto'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha inicio</p>
                  <p className="font-medium">{new Date(selectedPase.created_at).toLocaleDateString('es-AR')}</p>
                </div>
                {selectedPase.pago_registrado && (
                  <div>
                    <p className="text-muted-foreground">Pago</p>
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Registrado</Badge>
                  </div>
                )}
              </div>

              {/* Admin flow buttons */}
              {isAdmin && (
                <div className="border-t pt-3 space-y-3">
                  {/* Iniciado → Pendiente firmas or Revisión liga */}
                  {selectedPase.estado === 'iniciado' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => changeEstadoMutation.mutate({ id: selectedPase.id, estado: 'pendiente_firmas' })} disabled={changeEstadoMutation.isPending}>
                        Pasar a Pendiente Firmas
                      </Button>
                    </div>
                  )}

                  {selectedPase.estado === 'pendiente_firmas' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => changeEstadoMutation.mutate({ id: selectedPase.id, estado: 'revision_liga' })} disabled={changeEstadoMutation.isPending}>
                        Enviar a Revisión Liga
                      </Button>
                    </div>
                  )}

                  {selectedPase.estado === 'revision_liga' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" className="gap-1" onClick={() => changeEstadoMutation.mutate({ id: selectedPase.id, estado: 'aprobado' })} disabled={changeEstadoMutation.isPending}>
                        <CheckCircle className="w-4 h-4" /> Aprobar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => changeEstadoMutation.mutate({ id: selectedPase.id, estado: 'observado' })} disabled={changeEstadoMutation.isPending}>
                        <AlertCircle className="w-4 h-4" /> Observar
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => changeEstadoMutation.mutate({ id: selectedPase.id, estado: 'rechazado' })} disabled={changeEstadoMutation.isPending}>
                        <XCircle className="w-4 h-4" /> Rechazar
                      </Button>
                    </div>
                  )}

                  {selectedPase.estado === 'observado' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => changeEstadoMutation.mutate({ id: selectedPase.id, estado: 'revision_liga' })} disabled={changeEstadoMutation.isPending}>
                        Volver a Revisión
                      </Button>
                    </div>
                  )}

                  {/* Aprobado → pendiente_pago or habilitado directly */}
                  {selectedPase.estado === 'aprobado' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" className="gap-1" onClick={() => changeEstadoMutation.mutate({ id: selectedPase.id, estado: 'pendiente_pago' })} disabled={changeEstadoMutation.isPending}>
                        <DollarSign className="w-4 h-4" /> Requiere Pago
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => changeEstadoMutation.mutate({ id: selectedPase.id, estado: 'habilitado' })} disabled={changeEstadoMutation.isPending}>
                        <CheckCircle className="w-4 h-4" /> Habilitar sin pago
                      </Button>
                    </div>
                  )}

                  {/* Pendiente pago → register payment */}
                  {selectedPase.estado === 'pendiente_pago' && (
                    <div className="space-y-2">
                      <Label>Registrar Pago</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Monto"
                          value={montoRegistro}
                          onChange={(e) => setMontoRegistro(e.target.value)}
                          className="w-40"
                        />
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => registrarPagoMutation.mutate({ id: selectedPase.id, monto: parseFloat(montoRegistro) || 0 })}
                          disabled={registrarPagoMutation.isPending}
                        >
                          <DollarSign className="w-4 h-4" /> Registrar y Habilitar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
