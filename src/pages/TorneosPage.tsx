import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Torneos from './Torneos';

export default function TorneosPage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  return (
    <DashboardLayout userRole={userRole} userName={userName} pageTitle="TORNEOS" onLogout={signOut}>
      <Torneos />
    </DashboardLayout>
  );
}
