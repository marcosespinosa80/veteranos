import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Dashboard from './Dashboard';

export default function DashboardPage() {
  const { profile, role, signOut } = useAuth();
  
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  return (
    <DashboardLayout
      userRole={userRole}
      userName={userName}
      pageTitle="Panel de Control"
      onLogout={signOut}
    >
      <Dashboard />
    </DashboardLayout>
  );
}
