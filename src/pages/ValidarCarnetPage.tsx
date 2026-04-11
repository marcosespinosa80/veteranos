import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, CreditCard, AlertTriangle } from 'lucide-react';

function getEstadoJugadorLabel(j: any): { label: string; color: string } {
  if (!j) return { label: 'DESCONOCIDO', color: 'bg-muted text-muted-foreground' };
  if (j.suspendido_fechas > 0) return { label: `SUSPENDIDO (${j.suspendido_fechas} FECHA${j.suspendido_fechas > 1 ? 'S' : ''})`, color: 'bg-destructive/15 text-destructive border-destructive/30' };
  if (j.estado === 'habilitado') return { label: 'ACTIVO', color: 'bg-primary/15 text-primary border-primary/30' };
  if (j.estado === 'expulsado') return { label: 'EXPULSADO', color: 'bg-destructive/15 text-destructive border-destructive/30' };
  return { label: 'NO HABILITADO', color: 'bg-warning/15 text-warning border-warning/30' };
}

function ValidarCarnet() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['validar-carnet', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carnets')
        .select('*, jugador:jugadores(id, nombre, apellido, dni, estado, foto_url, fecha_nacimiento, suspendido_fechas, equipo:equipos!jugadores_equipo_id_fkey(nombre_equipo), categoria:categorias(nombre_categoria))')
        .eq('qr_token', token!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Validando carnet...</div>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-bold text-destructive">Carnet no encontrado</h2>
        <p className="text-muted-foreground text-sm">El código QR no corresponde a ningún carnet registrado.</p>
      </div>
    );
  }

  const j = data.jugador as any;
  const carnetActivo = data.estado === 'activo';
  const jugadorHabilitado = j?.estado === 'habilitado';
  const suspendido = (j?.suspendido_fechas || 0) > 0;
  const esValido = carnetActivo && jugadorHabilitado && !suspendido;
  const estadoInfo = getEstadoJugadorLabel(j);
  const fechaNac = j?.fecha_nacimiento
    ? new Date(j.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR')
    : '—';

  return (
    <div className="max-w-md mx-auto">
      <Card className={`border-2 ${esValido ? 'border-primary' : 'border-destructive'}`}>
        <CardContent className="p-6 space-y-4">
          <div className={`flex flex-col items-center py-4 rounded-lg ${esValido ? 'bg-primary/10' : 'bg-destructive/10'}`}>
            {esValido ? (
              <CheckCircle className="w-16 h-16 text-primary mb-2" />
            ) : (
              <XCircle className="w-16 h-16 text-destructive mb-2" />
            )}
            <h2 className={`text-2xl font-bold ${esValido ? 'text-primary' : 'text-destructive'}`}>
              {esValido ? 'VÁLIDO' : 'NO VÁLIDO'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              {j?.foto_url ? (
                <img src={j.foto_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold">{j?.apellido}, {j?.nombre}</p>
              <p className="text-sm text-muted-foreground">DNI: {j?.dni}</p>
              <p className="text-sm">{j?.equipo?.nombre_equipo || 'Sin equipo'}</p>
              <p className="text-xs text-muted-foreground">{j?.categoria?.nombre_categoria}</p>
              <p className="text-xs text-muted-foreground">Fecha Nac: {fechaNac}</p>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">N° Carnet:</span>
              <span className="font-bold">{(data as any).numero_carnet}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Carnet:</span>
              <Badge variant="outline" className={carnetActivo ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}>
                {carnetActivo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Jugador:</span>
              <Badge variant="outline" className={estadoInfo.color}>
                {estadoInfo.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ValidarCarnetPage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  return (
    <DashboardLayout userRole={userRole} userName={userName} pageTitle="Validar Carnet" onLogout={signOut}>
      <ValidarCarnet />
    </DashboardLayout>
  );
}
