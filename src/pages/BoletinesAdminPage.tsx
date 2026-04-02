import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import BoletinesAdmin from './BoletinesAdmin';

export default function BoletinesAdminPage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  if (role !== 'admin_general' && role !== 'admin_comun') {
    return (
      <DashboardLayout userRole={userRole} userName={userName} pageTitle="Boletines" onLogout={signOut}>
        <div className="flex items-center justify-center h-64 text-muted-foreground">No autorizado</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole} userName={userName} pageTitle="Boletines (Admin)" onLogout={signOut}>
      <BoletinesAdmin />
    </DashboardLayout>
  );
}
