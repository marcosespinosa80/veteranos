import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import { TarifaFormDialog } from './TarifaFormDialog';

const TIPO_LABELS: Record<string, string> = {
  inscripcion_jugador: 'Inscripción Jugador',
  inscripcion_equipo: 'Inscripción Equipo',
  cuota_mensual: 'Cuota Mensual',
  pase: 'Pase',
  multa: 'Multa',
  arbitraje: 'Arbitraje',
  otro: 'Otro',
};

export function TarifasTab() {
  const { role } = useAuth();
  const isAdmin = role === 'admin_general' || role === 'admin_comun';
  const [editTarifa, setEditTarifa] = useState<any | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: tarifas = [], isLoading } = useQuery({
    queryKey: ['tarifas-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarifas')
        .select('*')
        .order('estado', { ascending: true })
        .order('tipo')
        .order('fecha_inicio', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nueva Tarifa
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Cargando tarifas...</p>
      ) : tarifas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay tarifas registradas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Temporada</TableHead>
              <TableHead>Estado</TableHead>
              {isAdmin && <TableHead className="w-[80px]">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tarifas.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{TIPO_LABELS[t.tipo] || t.tipo}</TableCell>
                <TableCell>{formatMoney(Number(t.monto))}</TableCell>
                <TableCell>
                  {t.fecha_inicio}
                  {t.fecha_fin ? ` → ${t.fecha_fin}` : ' → Indefinida'}
                </TableCell>
                <TableCell>{t.temporada}</TableCell>
                <TableCell>
                  <Badge variant={t.estado === 'activa' ? 'default' : 'secondary'}>
                    {t.estado === 'activa' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditTarifa(t)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TarifaFormDialog
        open={showNew}
        onOpenChange={setShowNew}
        tarifa={null}
      />
      <TarifaFormDialog
        open={!!editTarifa}
        onOpenChange={(v) => { if (!v) setEditTarifa(null); }}
        tarifa={editTarifa}
      />
    </div>
  );
}
