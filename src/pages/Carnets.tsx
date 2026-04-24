import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CreditCard, QrCode, Users, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logoLvfc from '@/assets/logo-lvfc.png';

type EstadoFiltro = 'todos' | 'pendientes' | 'generados';

export default function Carnets() {
  const { role, user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [selectedJugador, setSelectedJugador] = useState<any>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ creados: number; existentes: number; errores: number } | null>(null);
  const isAdmin = role === 'admin_general' || role === 'admin_comun';
  const carnetRef = useRef<HTMLDivElement>(null);

  // Fetch all jugadores with their carnet (left join)
  const { data: jugadores = [], isLoading } = useQuery({
    queryKey: ['carnets-jugadores', user?.id, role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jugadores')
        .select(`
          id, nombre, apellido, dni, estado, foto_url, fecha_nacimiento, suspendido_fechas,
          equipo:equipos!jugadores_equipo_id_fkey(nombre_equipo),
          categoria:categorias(nombre_categoria),
          carnet:carnets(id, numero_carnet, qr_token, estado, codigo, vigencia_desde, vigencia_hasta)
        `)
        .order('apellido', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !loading && !!user,
  });

  const generateMutation = useMutation({
    mutationFn: async (jugador: { id: string; dni: string }) => {
      const codigo = `LVFC-${jugador.dni.replace(/\D/g, '')}`;
      const { error } = await supabase.from('carnets').insert({
        jugador_id: jugador.id,
        codigo,
        estado: 'activo',
      });
      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya tiene carnet');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carnets-jugadores'] });
      toast({ title: 'Carnet generado correctamente' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const renewMutation = useMutation({
    mutationFn: async (carnetId: string) => {
      const hoy = new Date();
      const hasta = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
      const { error } = await supabase.from('carnets').update({
        vigencia_desde: hoy.toISOString().slice(0, 10),
        vigencia_hasta: hasta.toISOString().slice(0, 10),
        estado: 'activo',
      }).eq('id', carnetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carnets-jugadores'] });
      toast({ title: 'Vigencia renovada' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const bulkGenerateMutation = useMutation({
    mutationFn: async () => {
      const { data: habilitados, error: hErr } = await supabase
        .from('jugadores')
        .select('id, dni')
        .eq('estado', 'habilitado');
      if (hErr) throw hErr;

      const { data: existingCarnets, error: cErr } = await supabase
        .from('carnets')
        .select('jugador_id');
      if (cErr) throw cErr;

      const existingSet = new Set((existingCarnets || []).map((c: any) => c.jugador_id));
      const sinCarnet = (habilitados || []).filter((j: any) => !existingSet.has(j.id));

      let creados = 0;
      const existentes = (habilitados || []).length - sinCarnet.length;

      if (sinCarnet.length > 0) {
        const hoy = new Date();
        const hasta = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
        const rows = sinCarnet.map((j: any) => ({
          jugador_id: j.id,
          codigo: `LVFC-${(j.dni || '').replace(/\D/g, '')}`,
          vigencia_desde: hoy.toISOString().slice(0, 10),
          vigencia_hasta: hasta.toISOString().slice(0, 10),
          estado: 'activo' as const,
        }));

        const { error: iErr, data: inserted } = await supabase.from('carnets').insert(rows).select('id');
        if (iErr) throw iErr;
        creados = inserted?.length || 0;
      }

      return { creados, existentes, errores: 0 };
    },
    onSuccess: (result) => {
      setBulkResult(result);
      queryClient.invalidateQueries({ queryKey: ['carnets-jugadores'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error en generación masiva', description: err.message, variant: 'destructive' });
    },
  });

  // Normalize jugadores: carnet may come as array or object from supabase
  const rows = useMemo(() => {
    return jugadores.map((j: any) => {
      const carnet = Array.isArray(j.carnet) ? j.carnet[0] : j.carnet;
      return { ...j, carnet };
    });
  }, [jugadores]);

  // Filter + sort
  const filtered = useMemo(() => {
    const searchDigits = search.replace(/\D/g, '');
    const searchLower = search.toLowerCase().trim();

    const result = rows.filter((j: any) => {
      // Estado filter
      if (estadoFiltro === 'pendientes' && j.carnet) return false;
      if (estadoFiltro === 'generados' && !j.carnet) return false;

      // Search filter
      if (searchLower) {
        const matchDni = searchDigits && (j.dni || '').replace(/\D/g, '').includes(searchDigits);
        const matchName = `${j.apellido} ${j.nombre}`.toLowerCase().includes(searchLower);
        if (!matchDni && !matchName) return false;
      }
      return true;
    });

    // Sort: pendientes primero, luego por apellido
    return result.sort((a: any, b: any) => {
      const aPend = !a.carnet ? 0 : 1;
      const bPend = !b.carnet ? 0 : 1;
      if (aPend !== bPend) return aPend - bPend;
      return (a.apellido || '').localeCompare(b.apellido || '');
    });
  }, [rows, search, estadoFiltro]);

  const totalPendientes = rows.filter((j: any) => !j.carnet).length;
  const totalGenerados = rows.filter((j: any) => !!j.carnet).length;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleDownloadPDF = async () => {
    if (!carnetRef.current) return;
    try {
      const canvas = await html2canvas(carnetRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [90, 130] });
      pdf.addImage(imgData, 'PNG', 0, 0, 90, 130);
      const j = selectedJugador;
      pdf.save(`carnet_${j?.apellido || 'jugador'}_${j?.nombre || ''}.pdf`);
    } catch {
      toast({ title: 'Error al generar PDF', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por DNI o apellido..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as EstadoFiltro)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos ({rows.length})</SelectItem>
              <SelectItem value="pendientes">Pendientes de generar ({totalPendientes})</SelectItem>
              <SelectItem value="generados">Con carnet ({totalGenerados})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Button onClick={() => { setBulkResult(null); setBulkDialogOpen(true); }} variant="outline" className="shrink-0">
            <Users className="w-4 h-4 mr-1" /> Generar carnets masivo
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} jugador{filtered.length !== 1 ? 'es' : ''}
      </p>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {estadoFiltro === 'pendientes' ? 'No hay jugadores pendientes de carnet' : 'No se encontraron jugadores'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead className="hidden sm:table-cell">DNI</TableHead>
                  <TableHead className="hidden md:table-cell">Club</TableHead>
                  <TableHead className="hidden lg:table-cell">Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-40 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((j: any) => {
                  const carnet = j.carnet;
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-sm font-bold">{carnet?.numero_carnet || '—'}</TableCell>
                      <TableCell className="font-medium">{j.apellido}, {j.nombre}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{j.dni}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{j.equipo?.nombre_equipo || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{j.categoria?.nombre_categoria || '—'}</TableCell>
                      <TableCell>
                        {carnet ? (
                          <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">Generado</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {carnet ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setSelectedJugador({ ...j, ...carnet, jugador: j })}>
                                <QrCode className="w-3 h-3 mr-1" /> Ver carnet
                              </Button>
                              {isAdmin && (
                                <Button size="icon" variant="ghost" title="Renovar vigencia" onClick={() => renewMutation.mutate(carnet.id)} disabled={renewMutation.isPending}>
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          ) : (
                            isAdmin && (
                              <Button size="sm" onClick={() => generateMutation.mutate({ id: j.id, dni: j.dni })} disabled={generateMutation.isPending}>
                                <CreditCard className="w-3 h-3 mr-1" /> Generar carnet
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Credencial Dialog */}
      <Dialog open={!!selectedJugador} onOpenChange={() => setSelectedJugador(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Credencial Digital</DialogTitle>
            <DialogDescription>Constancia de inscripción en la Liga</DialogDescription>
          </DialogHeader>
          {selectedJugador && (() => {
            const j = selectedJugador.jugador || selectedJugador;
            const fechaNac = j?.fecha_nacimiento
              ? new Date(j.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR')
              : '—';
            return (
              <>
                <div ref={carnetRef} className="border rounded-xl p-5 space-y-4 bg-white text-black" style={{ minWidth: 300 }}>
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <img src={logoLvfc} alt="LVFC" className="w-10 h-10" />
                      <div>
                        <p className="text-xs font-bold tracking-widest uppercase">Liga Veteranos FC</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Credencial Digital</p>
                        <p className="text-[9px] text-gray-400 italic">Constancia de inscripción en la Liga</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">N° Carnet</p>
                      <p className="text-2xl font-black tracking-tight">{selectedJugador.numero_carnet}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-24 h-28 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                      {j?.foto_url ? (
                        <img src={j.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <CreditCard className="w-10 h-10 text-gray-300" />
                      )}
                    </div>
                    <div className="space-y-1 pt-1">
                      <p className="text-lg font-bold leading-tight">{j?.apellido}</p>
                      <p className="text-lg font-bold leading-tight">{j?.nombre}</p>
                      <p className="text-xs text-gray-500 mt-1">Fecha Nac: {fechaNac}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-lg bg-gray-100 p-2 text-center">
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">DNI</p>
                      <p className="text-base font-bold mt-0.5">{j?.dni}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-gray-100 p-2 text-center">
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Club</p>
                        <p className="text-sm font-bold mt-0.5 break-words leading-tight">{j?.equipo?.nombre_equipo || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-gray-100 p-2 text-center">
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Categoría</p>
                        <p className="text-sm font-bold mt-0.5 break-words leading-tight">{j?.categoria?.nombre_categoria || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 flex flex-col items-center">
                    <div className="bg-black p-3 rounded-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${origin}/validar/${selectedJugador.qr_token}`)}`}
                        alt="QR Code"
                        className="w-28 h-28"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full" onClick={handleDownloadPDF}>
                    <Download className="w-4 h-4 mr-1" /> Descargar PDF
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bulk Generate Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generación masiva de carnets</DialogTitle>
            <DialogDescription>
              Se crearán carnets para todos los jugadores habilitados que aún no tengan uno.
            </DialogDescription>
          </DialogHeader>
          {bulkResult ? (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">Resumen:</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-primary/10 p-3">
                    <p className="text-2xl font-bold text-primary">{bulkResult.creados}</p>
                    <p className="text-xs text-muted-foreground">Creados</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-2xl font-bold">{bulkResult.existentes}</p>
                    <p className="text-xs text-muted-foreground">Ya existían</p>
                  </div>
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-2xl font-bold text-destructive">{bulkResult.errores}</p>
                    <p className="text-xs text-muted-foreground">Errores</p>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={() => setBulkDialogOpen(false)}>Cerrar</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Vigencia: desde hoy hasta dentro de 1 año.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => bulkGenerateMutation.mutate()} disabled={bulkGenerateMutation.isPending}>
                  {bulkGenerateMutation.isPending ? 'Generando...' : 'Generar carnets'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
