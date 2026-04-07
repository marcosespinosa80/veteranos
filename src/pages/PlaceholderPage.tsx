import { Construction } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/navigation';

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  const { profile, role, signOut } = useAuth();
  const userName = profile ? `${profile.nombre} ${profile.apellido}` : '';

  return (
    <DashboardLayout
      userRole={role as UserRole}
      userName={userName}
      pageTitle={title}
      onLogout={signOut}
    >
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Construction className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground">Esta sección estará disponible próximamente.</p>
      </div>
    </DashboardLayout>
  );
}
