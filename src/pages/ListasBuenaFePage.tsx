import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ListasBuenaFe from './ListasBuenaFe';

export default function ListasBuenaFePage() {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}`.trim() || 'Usuario' : 'Usuario';
  const userRole = role || 'admin_general';

  return (
    <DashboardLayout userRole={userRole} userName={userName} pageTitle="Listas de Buena Fe" onLogout={signOut}>
      <ListasBuenaFe />
    </DashboardLayout>
  );
}
