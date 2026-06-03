import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import logoLvfc from '@/assets/logo-lvfc.png';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, navigate, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const raw = identifier.trim();
    let emailToUse = raw;

    try {
      if (!raw.includes('@')) {
        // DNI flow → resolve via edge function
        const { data, error: fnErr } = await supabase.functions.invoke('resolve-login-identifier', {
          body: { identifier: raw },
        });
        if (fnErr || !data?.email) {
          setLoading(false);
          setError('Usuario o contraseña incorrectos.');
          return;
        }
        emailToUse = data.email;
      }

      const { error: signErr } = await signIn(emailToUse, password);
      setLoading(false);

      if (signErr) {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch (_e) {
      setLoading(false);
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img
            src={logoLvfc}
            alt="Liga de Veteranos de Fútbol de Catamarca"
            className="w-24 h-24 object-contain"
          />
          <div className="text-center">
            <h1 className="text-xl font-display font-bold text-foreground">
              Liga de Veteranos
            </h1>
            <p className="text-sm text-muted-foreground">
              de Fútbol de Catamarca
            </p>
          </div>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <p className="text-sm text-muted-foreground text-center">
              Ingresá con tu cuenta para acceder al sistema
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">DNI / Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Ingresá tu DNI o email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Ingresando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Ingresar
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          ¿Olvidaste tu contraseña?{' '}
          <Link to="/recuperar" className="text-primary hover:underline font-medium">
            Recuperar acceso
          </Link>
        </p>
      </div>
    </div>
  );
}
