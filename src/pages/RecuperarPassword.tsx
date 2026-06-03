import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import logoLvfc from '@/assets/logo-lvfc.png';

export default function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/cambiar-password`,
      });
    } catch (_e) {
      // never reveal
    }
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoLvfc} alt="LVFC" className="w-20 h-20 object-contain" />
          <h1 className="text-xl font-display font-bold">Recuperar acceso</h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <p className="text-sm text-muted-foreground text-center">
              Ingresá tu email de recuperación y te enviaremos un enlace para cambiar tu contraseña.
            </p>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-foreground">
                  Si el email está registrado, recibirás un enlace para cambiar tu contraseña.
                </p>
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Volver al login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-email">Email de recuperación</Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <Send className="w-4 h-4 mr-1" />
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>
                <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                  Volver al login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
