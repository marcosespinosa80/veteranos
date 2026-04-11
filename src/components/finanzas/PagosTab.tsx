import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RegistrarPagoDialog } from './RegistrarPagoDialog';

const MEDIO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  otro: 'Otro',
};

export function PagosTab() {
  const { role } = useAuth();
  const isAdmin = role === 'admin_general' || role === 'admin_comun';
  const [showPago, setShowPago] = useState(false);

  const { data: pagos = [], isLoading } = useQuery({
    queryKey: ['pagos-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos')
        .select('*, profiles!pagos_registrado_por_fkey(nombre, apellido)')
        .order('fecha_pago', { ascending: false })
        .limit(100);
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
          <Button onClick={() => setShowPago(true)}>
            <Plus className="w-4 h-4 mr-2" /> Registrar Pago
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Cargando pagos...</p>
      ) : pagos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay pagos registrados.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Registrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.fecha_pago).toLocaleDateString('es-AR')}</TableCell>
                <TableCell className="font-medium">{formatMoney(Number(p.monto_total))}</TableCell>
                <TableCell>
                  <Badge variant="outline">{MEDIO_LABELS[p.medio_pago] || p.medio_pago}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.referencia || '—'}</TableCell>
                <TableCell>
                  {p.profiles ? `${p.profiles.apellido}, ${p.profiles.nombre}` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RegistrarPagoDialog open={showPago} onOpenChange={setShowPago} />
    </div>
  );
}
