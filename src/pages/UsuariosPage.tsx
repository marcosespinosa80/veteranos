import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Usuarios from './Usuarios';

export default function UsuariosPage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  if (role !== 'admin_general') {
    return (
      <DashboardLayout userRole={userRole} userName={userName} pageTitle="Usuarios" onLogout={signOut}>
        <div className="flex items-center justify-center h-64 text-muted-foreground">No autorizado</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole} userName={userName} pageTitle="Usuarios" onLogout={signOut}>
      <Usuarios />
    </DashboardLayout>
  );
}
