import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Canchas from './Canchas';

export default function CanchasPage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  return (
    <DashboardLayout userRole={userRole} userName={userName} pageTitle="CANCHAS" onLogout={signOut}>
      <Canchas />
    </DashboardLayout>
  );
}
