import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, CreditCard, RefreshCw, QrCode, Users, Printer, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function getEstadoJugadorLabel(j: any): { label: string; color: string } {
  if (!j) return { label: 'DESCONOCIDO', color: 'bg-muted text-muted-foreground' };
  if (j.suspendido_fechas > 0) return { label: `SUSPENDIDO (${j.suspendido_fechas} FECHA${j.suspendido_fechas > 1 ? 'S' : ''})`, color: 'bg-destructive/15 text-destructive border-destructive/30' };
  if (j.estado === 'habilitado') return { label: 'ACTIVO', color: 'bg-primary/15 text-primary border-primary/30' };
  if (j.estado === 'expulsado') return { label: 'EXPULSADO', color: 'bg-destructive/15 text-destructive border-destructive/30' };
  return { label: 'NO HABILITADO', color: 'bg-warning/15 text-warning border-warning/30' };
}

export default function Carnets() {
  const { role, user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedJugador, setSelectedJugador] = useState<any>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ creados: number; existentes: number; errores: number } | null>(null);
  const isAdmin = role === 'admin_general' || role === 'admin_comun';
  const carnetRef = useRef<HTMLDivElement>(null);

  const { data: carnetsData = [], isLoading } = useQuery({
    queryKey: ['carnets', user?.id, role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carnets')
        .select('*, jugador:jugadores(id, nombre, apellido, dni, estado, foto_url, fecha_nacimiento, suspendido_fechas, equipo:equipos!jugadores_equipo_id_fkey(nombre_equipo), categoria:categorias(nombre_categoria))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !loading && !!user,
  });

  const { data: jugadoresBusqueda = [] } = useQuery({
    queryKey: ['jugadores-busqueda-carnet', search],
    enabled: search.length >= 2 && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jugadores')
        .select('id, nombre, apellido, dni, estado, foto_url, equipo:equipos!jugadores_equipo_id_fkey(nombre_equipo), categoria:categorias(nombre_categoria)')
        .or(`dni.ilike.%${search}%,apellido.ilike.%${search}%`)
        .order('apellido')
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const carnetMap = new Map(carnetsData.map((c: any) => [c.jugador_id, c]));

  const generateMutation = useMutation({
    mutationFn: async (jugador: { id: string; dni: string }) => {
      const codigo = `LVFC-${jugador.dni}`;
      const hoy = new Date();
      const hasta = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
      const { error } = await supabase.from('carnets').insert({
        jugador_id: jugador.id,
        codigo,
        vigencia_desde: hoy.toISOString().slice(0, 10),
        vigencia_hasta: hasta.toISOString().slice(0, 10),
        estado: 'activo',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carnets'] });
      queryClient.invalidateQueries({ queryKey: ['jugadores-busqueda-carnet'] });
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
      queryClient.invalidateQueries({ queryKey: ['carnets'] });
      toast({ title: 'Vigencia renovada' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const toggleEstadoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const newEstado = estado === 'activo' ? 'inactivo' : 'activo';
      const { error } = await supabase.from('carnets').update({ estado: newEstado }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carnets'] });
      toast({ title: 'Estado actualizado' });
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
          codigo: `LVFC-${j.dni}`,
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
      queryClient.invalidateQueries({ queryKey: ['carnets'] });
      queryClient.invalidateQueries({ queryKey: ['jugadores-busqueda-carnet'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error en generación masiva', description: err.message, variant: 'destructive' });
    },
  });

  const filtered = carnetsData.filter((c: any) => {
    if (!search) return true;
    const j = c.jugador;
    return `${j?.nombre} ${j?.apellido} ${j?.dni}`.toLowerCase().includes(search.toLowerCase());
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Print handler
  const handlePrint = () => {
    if (!carnetRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = carnetRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Credencial Digital</title>
          <style>
            body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; }
            * { box-sizing: border-box; }
            img { max-width: 100%; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  // Download PDF handler
  const handleDownloadPDF = async () => {
    if (!carnetRef.current) return;
    try {
      const canvas = await html2canvas(carnetRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [90, 130] });
      pdf.addImage(imgData, 'PNG', 0, 0, 90, 130);
      const j = selectedJugador?.jugador;
      pdf.save(`carnet_${j?.apellido || 'jugador'}_${j?.nombre || ''}.pdf`);
    } catch {
      toast({ title: 'Error al generar PDF', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por DNI o apellido..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isAdmin && (
          <Button onClick={() => { setBulkResult(null); setBulkDialogOpen(true); }} variant="outline" className="shrink-0">
            <Users className="w-4 h-4 mr-1" /> Generar carnets masivo
          </Button>
        )}
      </div>

      {isAdmin && search.length >= 2 && jugadoresBusqueda.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Resultados de búsqueda:</p>
            <div className="space-y-2">
              {jugadoresBusqueda.map((j: any) => {
                const existingCarnet = carnetMap.get(j.id);
                return (
                  <div key={j.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div>
                      <span className="font-medium text-sm">{j.apellido}, {j.nombre}</span>
                      <span className="text-xs text-muted-foreground ml-2">DNI {j.dni}</span>
                      <span className="text-xs text-muted-foreground ml-2">{(j.equipo as any)?.nombre_equipo || 'Sin equipo'}</span>
                      {existingCarnet && (
                        <Badge variant="outline" className="ml-2 text-xs bg-primary/15 text-primary border-primary/30">
                          Tiene carnet
                        </Badge>
                      )}
                    </div>
                    {existingCarnet ? (
                      <Button size="sm" variant="outline" onClick={() => renewMutation.mutate(existingCarnet.id)} disabled={renewMutation.isPending}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Renovar carnet
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => generateMutation.mutate({ id: j.id, dni: j.dni })} disabled={generateMutation.isPending}>
                        <CreditCard className="w-3 h-3 mr-1" /> Generar carnet
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">{filtered.length} carnet{filtered.length !== 1 ? 's' : ''}</p>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No se encontraron carnets</div>
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
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => {
                  const j = c.jugador;
                  const estadoInfo = getEstadoJugadorLabel(j);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm font-bold">{c.numero_carnet}</TableCell>
                      <TableCell className="font-medium">{j?.apellido}, {j?.nombre}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{j?.dni}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{j?.equipo?.nombre_equipo || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{j?.categoria?.nombre_categoria || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={estadoInfo.color}>
                          {estadoInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Ver credencial" onClick={() => setSelectedJugador(c)}>
                            <QrCode className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button size="icon" variant="ghost" title="Renovar vigencia" onClick={() => renewMutation.mutate(c.id)} disabled={renewMutation.isPending}>
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleEstadoMutation.mutate({ id: c.id, estado: c.estado })}>
                                {c.estado === 'activo' ? 'Desactivar' : 'Activar'}
                              </Button>
                            </>
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
            <DialogDescription>Carnet del jugador</DialogDescription>
          </DialogHeader>
          {selectedJugador && (() => {
            const j = selectedJugador.jugador;
            const estadoInfo = getEstadoJugadorLabel(j);
            const fechaNac = j?.fecha_nacimiento
              ? new Date(j.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR')
              : '—';
            return (
              <>
                <div ref={carnetRef} className="border rounded-xl p-5 space-y-4 bg-card" style={{ minWidth: 300 }}>
                  {/* Header with carnet number */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Liga Veteranos FC</p>
                      <p className="text-xs text-muted-foreground">Credencial Digital</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">N° Carnet</p>
                      <p className="text-2xl font-black tracking-tight">{selectedJugador.numero_carnet}</p>
                    </div>
                  </div>

                  {/* Photo + Name */}
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-28 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0 border">
                      {j?.foto_url ? (
                        <img src={j.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <CreditCard className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1 pt-1">
                      <p className="text-lg font-bold leading-tight">{j?.apellido}</p>
                      <p className="text-lg font-bold leading-tight">{j?.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-1">Fecha Nac: {fechaNac}</p>
                    </div>
                  </div>

                  {/* Key data: DNI, Club, Categoría */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/70 p-2">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">DNI</p>
                      <p className="text-sm font-bold mt-0.5">{j?.dni}</p>
                    </div>
                    <div className="rounded-lg bg-muted/70 p-2">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Club</p>
                      <p className="text-sm font-bold mt-0.5 truncate">{j?.equipo?.nombre_equipo || '—'}</p>
                    </div>
                    <div className="rounded-lg bg-muted/70 p-2">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Categoría</p>
                      <p className="text-sm font-bold mt-0.5 truncate">{j?.categoria?.nombre_categoria || '—'}</p>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex justify-center">
                    <Badge variant="outline" className={`text-sm px-4 py-1 font-semibold ${estadoInfo.color}`}>
                      {estadoInfo.label}
                    </Badge>
                  </div>

                  {/* QR */}
                  <div className="border-t pt-3 flex flex-col items-center">
                    <div className="bg-foreground text-background p-3 rounded-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${origin}/validar/${selectedJugador.qr_token}`)}`}
                        alt="QR Code"
                        className="w-28 h-28"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1" /> Imprimir
                  </Button>
                  <Button className="flex-1" onClick={handleDownloadPDF}>
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
