import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Multas from './Multas';

export default function MultasPage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  return (
    <DashboardLayout
      userRole={userRole}
      userName={userName}
      pageTitle="Multas"
      onLogout={signOut}
    >
      <Multas />
    </DashboardLayout>
  );
}
