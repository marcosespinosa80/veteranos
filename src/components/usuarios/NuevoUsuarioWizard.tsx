import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DniInput } from '@/components/ui/dni-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { type UserRole } from '@/lib/navigation';
import { MODULE_KEYS, MODULE_LABELS, getDefaultModules, type ModuleKey } from '@/lib/modules';
import { dniDigits, formatDni } from '@/lib/dni';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin_general', label: 'Administrador General' },
  { value: 'admin_comun', label: 'Administrador' },
  { value: 'delegado', label: 'Delegado' },
  { value: 'arbitro', label: 'Árbitro' },
  { value: 'tribunal', label: 'Tribunal' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NuevoUsuarioWizard({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  // Step 1 — player search
  const [dniSearch, setDniSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [jugadorError, setJugadorError] = useState('');
  const [jugador, setJugador] = useState<any>(null);

  // Step 2 — user data
  const [role, setRole] = useState<UserRole>('admin_comun');
  const [activo, setActivo] = useState(true);
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(getDefaultModules('admin_comun'));
  const [delegadoPosicion, setDelegadoPosicion] = useState<'delegado_1' | 'delegado_2' | ''>('');

  const resetForm = () => {
    setDniSearch('');
    setSearching(false);
    setJugadorError('');
    setJugador(null);
    setRole('admin_comun');
    setActivo(true);
    setPassword('');
    setRecoveryEmail('');
    setModules(getDefaultModules('admin_comun'));
    setDelegadoPosicion('');
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setModules(getDefaultModules(newRole));
    if (newRole !== 'delegado') setDelegadoPosicion('');
  };

  const toggleModule = (key: ModuleKey) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const searchJugador = async () => {
    const digits = dniDigits(dniSearch);
    if (digits.length < 7) {
      setJugadorError('Ingresá un DNI válido (7 u 8 dígitos)');
      return;
    }
    setSearching(true);
    setJugadorError('');
    setJugador(null);

    const { data, error } = await supabase
      .from('jugadores')
      .select('id, nombre, apellido, dni, estado, equipo_id, categoria:categorias(nombre_categoria), equipo:equipos!jugadores_equipo_id_fkey(nombre_equipo)');

    setSearching(false);

    if (error) {
      setJugadorError('Error al buscar jugador');
      return;
    }

    const match = (data || []).find((j: any) => (j.dni || '').replace(/\D/g, '') === digits);
    if (!match) {
      setJugadorError('Jugador no encontrado. Primero debe cargarse el jugador en el padrón.');
      return;
    }

    // Check if profile already exists for this player
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('jugador_id', match.id)
      .maybeSingle();

    if (existing) {
      setJugadorError('Este jugador ya tiene un usuario asociado. Editá ese usuario desde la lista.');
      return;
    }

    setJugador(match);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const modulesList = MODULE_KEYS.map((k) => ({ module_key: k, enabled: modules[k] }));
      const payload = {
        jugador_id: jugador.id,
        recovery_email: recoveryEmail.trim() || null,
        password,
        role,
        activo,
        delegado_posicion: role === 'delegado' ? delegadoPosicion : null,
        modules: modulesList,
      };
      const { data, error } = await supabase.functions.invoke('create-user', { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      onOpenChange(false);
      resetForm();
      toast({ title: 'Usuario creado exitosamente' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const recoveryValid = !recoveryEmail.trim() || emailRe.test(recoveryEmail.trim());

  const canSubmit = () => {
    if (!jugador) return false;
    if (password.length < 8) return false;
    if (!recoveryValid) return false;
    if (role === 'delegado') {
      if (!delegadoPosicion) return false;
      if (jugador.estado !== 'habilitado') return false;
      if (!jugador.equipo_id) return false;
    }
    return true;
  };

  const dniFormatted = jugador ? formatDni(jugador.dni || '') : '';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Nuevo Usuario
          </DialogTitle>
          <DialogDescription>
            El usuario se crea siempre a partir de un jugador del padrón. Buscá primero el jugador por DNI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* STEP 1 — PLAYER SEARCH */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1">1. Jugador del padrón</h3>
            {!jugador ? (
              <>
                <div className="space-y-2">
                  <Label>DNI del jugador *</Label>
                  <div className="flex gap-2">
                    <DniInput
                      placeholder="28.404.402"
                      value={dniSearch}
                      onChange={(v) => { setDniSearch(v); setJugadorError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && searchJugador()}
                    />
                    <Button variant="outline" onClick={searchJugador} disabled={searching || !dniSearch.trim()}>
                      <Search className="w-4 h-4 mr-1" /> Buscar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Se acepta con o sin puntos. El DNI del jugador será el nombre de usuario.</p>
                </div>

                {jugadorError && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {jugadorError}
                  </div>
                )}
              </>
            ) : (
              <div className="border rounded-md p-4 space-y-2 bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{jugador.apellido}, {jugador.nombre}</p>
                    <p className="text-sm text-muted-foreground">DNI: {dniFormatted}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={jugador.estado === 'habilitado' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}
                  >
                    {jugador.estado}
                  </Badge>
                </div>
                <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <div><span className="text-muted-foreground">Equipo: </span><span className="font-medium">{jugador.equipo?.nombre_equipo || '—'}</span></div>
                  <div><span className="text-muted-foreground">Categoría: </span><span className="font-medium">{jugador.categoria?.nombre_categoria || '—'}</span></div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setJugador(null); setDelegadoPosicion(''); }}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Buscar otro jugador
                </Button>
              </div>
            )}
          </section>

          {/* STEP 2 — USER DATA (locked until player found) */}
          {jugador && (
            <>
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">2. Datos del usuario</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Usuario (DNI)</Label>
                    <Input value={dniFormatted} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Se asigna automáticamente desde el jugador.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre completo</Label>
                    <Input value={`${jugador.apellido}, ${jugador.nombre}`} disabled className="bg-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contraseña inicial * (mín. 8 caracteres)</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email de recuperación (opcional)</Label>
                    <Input
                      type="email"
                      placeholder="usuario@gmail.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                    />
                    {!recoveryValid && <p className="text-xs text-destructive">Email inválido</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rol del sistema *</Label>
                    <Select value={role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Switch checked={activo} onCheckedChange={setActivo} id="activo-switch" />
                    <Label htmlFor="activo-switch">{activo ? 'Activo' : 'Inactivo'}</Label>
                  </div>
                </div>
              </section>

              {/* DELEGADO POSITION */}
              {role === 'delegado' && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-1">3. Posición de delegado</h3>
                  {jugador.estado !== 'habilitado' && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      El jugador debe estar habilitado para ser delegado.
                    </div>
                  )}
                  {!jugador.equipo_id && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      El jugador no tiene equipo asignado.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Posición *</Label>
                      <Select value={delegadoPosicion} onValueChange={(v) => setDelegadoPosicion(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delegado_1">Delegado 1</SelectItem>
                          <SelectItem value="delegado_2">Delegado 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Club</Label>
                      <Input value={jugador.equipo?.nombre_equipo || ''} disabled className="bg-muted" />
                    </div>
                  </div>
                </section>
              )}

              {/* MODULES */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">
                  {role === 'delegado' ? '4.' : '3.'} Módulos permitidos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MODULE_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={modules[key]} onCheckedChange={() => toggleModule(key)} />
                      <span>{MODULE_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creando...' : 'Confirmar Alta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
