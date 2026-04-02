import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Carnets from './Carnets';

export default function CarnetsPage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  if (role !== 'admin_general' && role !== 'admin_comun' && role !== 'arbitro') {
    return (
      <DashboardLayout userRole={userRole} userName={userName} pageTitle="Carnets" onLogout={signOut}>
        <div className="flex items-center justify-center h-64 text-muted-foreground">No autorizado</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole} userName={userName} pageTitle="Carnets" onLogout={signOut}>
      <Carnets />
    </DashboardLayout>
  );
}
