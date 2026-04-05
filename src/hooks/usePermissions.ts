import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultModules, type ModuleKey } from '@/lib/modules';

export function usePermissions() {
  const { user, role } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('module_key, enabled')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hasModule = (moduleKey: ModuleKey): boolean => {
    if (!role) return false;
    // If no permissions in DB, fallback to role defaults
    if (!permissions || permissions.length === 0) {
      return getDefaultModules(role)[moduleKey] ?? false;
    }
    const perm = permissions.find((p) => p.module_key === moduleKey);
    if (!perm) {
      // Not in DB, fallback to role default
      return getDefaultModules(role)[moduleKey] ?? false;
    }
    return perm.enabled;
  };

  return { hasModule, isLoading };
}
