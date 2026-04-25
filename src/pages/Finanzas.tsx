import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, AlertTriangle, Tag } from 'lucide-react';
import { TarifasTab } from '@/components/finanzas/TarifasTab';
import { DeudasTab } from '@/components/finanzas/DeudasTab';
import { ReportesTab } from '@/components/finanzas/ReportesTab';

export default function Finanzas() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin_general' || role === 'admin_comun';

  // KPI: Total recaudado
  const { data: totalRecaudado = 0 } = useQuery({
    queryKey: ['finanzas-kpi-recaudado'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pagos').select('monto_total');
      if (error) throw error;
      return (data || []).reduce((sum: number, p: any) => sum + Number(p.monto_total), 0);
    },
  });

  // KPI: Deudas pendientes
  const { data: totalDeuda = 0 } = useQuery({
    queryKey: ['finanzas-kpi-deuda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('monto')
        .in('estado_pago', ['pendiente', 'vencido']);
      if (error) throw error;
      return (data || []).reduce((sum: number, c: any) => sum + Number(c.monto), 0);
    },
  });

  // KPI: Tarifas activas
  const { data: tarifasActivas = 0 } = useQuery({
    queryKey: ['finanzas-kpi-tarifas'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tarifas')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'activa');
      if (error) throw error;
      return count || 0;
    },
  });

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión Financiera</h1>
          <p className="text-muted-foreground text-sm">Tarifas, pagos y deudas de la liga</p>
        </div>
        {isAdmin && <AsignarMultaDialog />}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-500/10 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recaudado</p>
              <p className="text-2xl font-bold">{formatMoney(totalRecaudado)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-red-500/10 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deudas Pendientes</p>
              <p className="text-2xl font-bold">{formatMoney(totalDeuda)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-500/10 p-3">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tarifas Activas</p>
              <p className="text-2xl font-bold">{tarifasActivas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tarifas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="deudas">Deudas</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>
        <TabsContent value="tarifas"><TarifasTab /></TabsContent>
        <TabsContent value="pagos"><PagosTab /></TabsContent>
        <TabsContent value="deudas"><DeudasTab /></TabsContent>
        <TabsContent value="reportes"><ReportesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
