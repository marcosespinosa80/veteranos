import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipo: any | null;
}

function estadoLabel(j: any) {
  if (j.estado === 'habilitado') {
    if (j.suspendido_fechas > 0) return `Suspendido (${j.suspendido_fechas})`;
    return 'Habilitado';
  }
  if (j.estado === 'expulsado') return 'Expulsado';
  return 'No habilitado';
}

function estadoVariant(j: any): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (j.estado === 'habilitado' && j.suspendido_fechas > 0) return 'destructive';
  if (j.estado === 'habilitado') return 'default';
  if (j.estado === 'expulsado') return 'destructive';
  return 'secondary';
}

export function PlantelDrawer({ open, onOpenChange, equipo }: Props) {
  // Categories this team participates in
  const { data: teamCats = [] } = useQuery({
    queryKey: ['equipo-categorias-detail', equipo?.id],
    enabled: open && !!equipo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipo_categoria')
        .select('categoria_id, categorias(id, nombre_categoria)')
        .eq('equipo_id', equipo!.id)
        .eq('temporada', 2026);
      if (error) throw error;
      return data.map((d: any) => d.categorias);
    },
  });

  // All players of this team
  const { data: jugadores = [] } = useQuery({
    queryKey: ['jugadores-plantel', equipo?.id],
    enabled: open && !!equipo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jugadores')
        .select('id, nombre, apellido, dni, fecha_nacimiento, estado, es_delegado, suspendido_fechas, categoria_id')
        .eq('equipo_id', equipo!.id)
        .order('apellido');
      if (error) throw error;
      return data;
    },
  });

  const defaultTab = teamCats.length > 0 ? teamCats[0]?.id : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {equipo?.nombre_equipo}
            <Badge variant={equipo?.estado === 'activo' ? 'default' : 'secondary'} className="ml-2">
              {equipo?.estado}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          {teamCats.length === 0 ? (
            <p className="text-muted-foreground text-sm">Este club no participa en ninguna categoría (2026).</p>
          ) : (
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1">
                {teamCats.map((cat: any) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                    {cat.nombre_categoria}
                  </TabsTrigger>
                ))}
              </TabsList>
              {teamCats.map((cat: any) => {
                const players = jugadores.filter((j: any) => j.categoria_id === cat.id);
                return (
                  <TabsContent key={cat.id} value={cat.id}>
                    {players.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">Sin jugadores en esta categoría.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Apellido y Nombre</TableHead>
                            <TableHead>DNI</TableHead>
                            <TableHead className="hidden sm:table-cell">Fecha Nac.</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {players.map((j: any) => (
                            <TableRow key={j.id}>
                              <TableCell className="font-medium">
                                {j.apellido}, {j.nombre}
                                {j.es_delegado && (
                                  <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">Delegado</Badge>
                                )}
                              </TableCell>
                              <TableCell>{j.dni}</TableCell>
                              <TableCell className="hidden sm:table-cell">{j.fecha_nacimiento}</TableCell>
                              <TableCell>
                                <Badge variant={estadoVariant(j)}>{estadoLabel(j)}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
