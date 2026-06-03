import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import logoLvfc from '@/assets/logo-lvfc.png';

export default function CambiarPassword() {
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setHasSession(!!session);
    };
    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) setHasSession(true);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast({ title: 'Sesión expirada', description: 'Volvé a iniciar sesión', variant: 'destructive' });
      window.location.replace('/login');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    const upd = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id);
    if (upd.error) console.error('[CambiarPassword] update profile:', upd.error);

    await supabase.auth.signOut();
    toast({ title: 'Contraseña actualizada correctamente' });
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoLvfc} alt="LVFC" className="w-20 h-20 object-contain" />
          <h1 className="text-xl font-display font-bold">Cambiar contraseña</h1>
        </div>
        <Card>
          {hasSession === false ? (
            <CardContent className="pt-6 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                La sesión para cambiar contraseña expiró.
              </p>
              <Button
                className="w-full"
                onClick={() => window.location.replace('/login')}
              >
                Volver al login
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-4">
                <p className="text-sm text-muted-foreground text-center">
                  Definí tu nueva contraseña para acceder al sistema.
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
                      disabled={!hasSession}
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
                      disabled={!hasSession}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !hasSession}>
                    {loading ? 'Guardando...' : 'Actualizar contraseña'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
