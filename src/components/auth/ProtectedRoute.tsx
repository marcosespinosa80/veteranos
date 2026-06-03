import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ROUTE_MODULE_MAP } from '@/lib/modules';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading, profile } = useAuth();
  const { hasModule, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  if (loading || (user && (!role || permLoading))) {
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.activo === false) {
    // Inactive user: force sign-out and bounce to login with message
    void import('@/integrations/supabase/client').then(({ supabase }) => supabase.auth.signOut());
    return <Navigate to="/login?inactivo=1" replace />;
  }

  if (profile?.must_change_password && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />;
  }

  const moduleKey = ROUTE_MODULE_MAP[location.pathname];
  if (moduleKey && !hasModule(moduleKey)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">No autorizado</p>
          <p className="text-sm text-muted-foreground">No tenés acceso a este módulo.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
