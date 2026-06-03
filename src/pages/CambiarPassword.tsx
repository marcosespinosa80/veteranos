import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import logoLvfc from '@/assets/logo-lvfc.png';

export default function CambiarPassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event to enable form
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Also allow existing logged-in users (must_change_password flow) to use this page
    if (user) setReady(true);
    return () => subscription.unsubscribe();
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) {
      toast({ title: 'Contraseña muy corta', description: 'Mínimo 8 caracteres', variant: 'destructive' });
      return;
    }
    if (pwd !== pwd2) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }
    setLoading(true);

    // Get current user BEFORE updating password / signing out
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log('[CambiarPassword] user.id antes de update:', currentUser?.id);

    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    if (currentUser) {
      const upd = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', currentUser.id);
      console.log('[CambiarPassword] update must_change_password:', upd);
    }

    toast({ title: 'Contraseña actualizada correctamente' });
    await supabase.auth.signOut();
    console.log('[CambiarPassword] signOut realizado');
    setLoading(false);
    console.log('[CambiarPassword] navigate /login');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoLvfc} alt="LVFC" className="w-20 h-20 object-contain" />
          <h1 className="text-xl font-display font-bold">Cambiar contraseña</h1>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <p className="text-sm text-muted-foreground text-center">
              {ready
                ? 'Definí tu nueva contraseña para acceder al sistema.'
                : 'Esperando enlace de recuperación...'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  minLength={8}
                  required
                  disabled={!ready}
                />
              </div>
              <div className="space-y-2">
                <Label>Repetir contraseña</Label>
                <Input
                  type="password"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  minLength={8}
                  required
                  disabled={!ready}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !ready}>
                {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
