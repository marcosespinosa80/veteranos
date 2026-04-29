import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import TorneoDetalle from './TorneoDetalle';

export default function TorneoDetallePage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  return (
    <DashboardLayout userRole={userRole} userName={userName} pageTitle="TORNEO" onLogout={signOut}>
      <TorneoDetalle />
    </DashboardLayout>
  );
}
