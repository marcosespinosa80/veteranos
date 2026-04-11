import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Finanzas from './Finanzas';

export default function FinanzasPage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  return (
    <DashboardLayout
      userRole={userRole}
      userName={userName}
      pageTitle="Gestión Financiera"
      onLogout={signOut}
    >
      <Finanzas />
    </DashboardLayout>
  );
}
