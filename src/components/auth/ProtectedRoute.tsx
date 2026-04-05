import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ROUTE_MODULE_MAP } from '@/lib/modules';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasModule, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  if (loading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check module permission for this route
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
