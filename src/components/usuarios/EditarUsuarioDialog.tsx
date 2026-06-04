import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { type UserRole } from '@/lib/navigation';
import { MODULE_KEYS, MODULE_LABELS, getDefaultModules, type ModuleKey } from '@/lib/modules';
import { formatDni } from '@/lib/dni';
import { useAuth } from '@/contexts/AuthContext';

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
  user: any;
}

export default function EditarUsuarioDialog({ open, onOpenChange, user }: Props) {
  const queryClient = useQueryClient();
  const { role: callerRole } = useAuth();
  const isAdminGeneral = callerRole === 'admin_general';

  const [role, setRole] = useState<UserRole>(user?.role || 'admin_comun');
  const [activo, setActivo] = useState(user?.activo ?? true);
  const [recoveryEmail, setRecoveryEmail] = useState(user?.recovery_email || user?.email || '');
  const [tempPwd, setTempPwd] = useState('');
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(() => {
    if (user?.permissions && user.permissions.length > 0) {
      const m = { ...getDefaultModules(user.role) };
      user.permissions.forEach((p: any) => {
        if (MODULE_KEYS.includes(p.module_key)) {
          m[p.module_key as ModuleKey] = p.enabled;
        }
      });
      return m;
    }
    return getDefaultModules(user?.role || 'admin_comun');
  });

  const { data: linkedJugador, isLoading: linkedJugadorLoading } = useQuery({
    queryKey: ['jugador-vinculado', user?.jugador_id],
    queryFn: async () => {
      if (!user?.jugador_id) return null;
      const { data: jugador, error: jErr } = await supabase
        .from('jugadores')
        .select('id, nombre, apellido, dni, estado, es_delegado, equipo_id, categoria_id, equipo:equipos!jugadores_equipo_id_fkey(nombre_equipo, delegado_1, delegado_2)')
        .eq('id', user.jugador_id)
        .single();
      if (jErr) throw jErr;

      let categoriaNombre = null;
      if (jugador?.categoria_id) {
        const { data: cat } = await supabase
          .from('categorias')
          .select('nombre_categoria')
          .eq('id', jugador.categoria_id)
          .single();
        categoriaNombre = cat?.nombre_categoria || null;
      }

      return { ...jugador, categoriaNombre };
    },
    enabled: !!user?.jugador_id,
  });

  const delegadoLabel = (() => {
    if (!linkedJugador?.es_delegado || !linkedJugador.equipo) return 'No';
    if (linkedJugador.equipo.delegado_1 === linkedJugador.id) return 'Delegado 1';
    if (linkedJugador.equipo.delegado_2 === linkedJugador.id) return 'Delegado 2';
    return 'Sí';
  })();

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setModules(getDefaultModules(newRole));
  };

  const toggleModule = (key: ModuleKey) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      const userId = user.id;

      const emailClean = recoveryEmail.trim().toLowerCase();
      const emailChanged = emailClean && emailClean !== (user.recovery_email || user.email || '').toLowerCase();

      if (isAdminGeneral && emailChanged) {
        const body = { user_id: userId, recovery_email: emailClean };
        const { data, error } = await supabase.functions.invoke('admin-update-user-email', { body });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      await supabase.from('user_roles').update({ role: role as any }).eq('user_id', userId);

      const profileUpdate: any = { activo };
      if (role !== 'delegado') {
        profileUpdate.equipo_id = null;
      }
      await supabase.from('profiles').update(profileUpdate).eq('id', userId);

      await supabase.from('user_module_permissions').delete().eq('user_id', userId);
      const rows = MODULE_KEYS.map((k) => ({ user_id: userId, module_key: k, enabled: modules[k] }));
      await supabase.from('user_module_permissions').insert(rows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      onOpenChange(false);
      toast({ title: 'Usuario actualizado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const sendRecoveryMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-send-recovery', { body: { user_id: user.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const email = data.email;
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/cambiar-password`,
      });
      if (rErr) throw rErr;
    },
    onSuccess: () => toast({ title: 'Link enviado al email de recuperación' }),
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const tempPwdMutation = useMutation({
    mutationFn: async () => {
      if (tempPwd.length < 8) throw new Error('Mínimo 8 caracteres');
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { user_id: user.id, new_password: tempPwd },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      setTempPwd('');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({ title: 'Contraseña temporal asignada', description: 'El usuario deberá cambiarla al iniciar sesión.' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario: {user?.apellido}, {user?.nombre}</DialogTitle>
          <DialogDescription>Modificá rol, datos de acceso, permisos o estado.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identidad de Acceso */}
          {isAdminGeneral && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-1">Identidad de Acceso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>DNI / Usuario</Label>
                  <p className="text-sm text-foreground font-medium">{formatDni(user?.username || '')}</p>
                </div>
                <div className="space-y-2">
                  <Label>Email de recuperación</Label>
                  <Input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="usuario@gmail.com"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Role & Active */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-1">Configuración</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rol</Label>
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
                <Switch checked={activo} onCheckedChange={setActivo} id="edit-activo" />
                <Label htmlFor="edit-activo">{activo ? 'Activo' : 'Inactivo'}</Label>
              </div>
            </div>
          </section>

          {/* Jugador vinculado (solo lectura) */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-1">Jugador vinculado</h3>
            {user?.jugador_id ? (
              <div className="border rounded-md p-4 space-y-2 bg-muted/30">
                {linkedJugadorLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                ) : linkedJugador ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{linkedJugador.apellido}, {linkedJugador.nombre}</p>
                      <Badge variant="outline" className={linkedJugador.estado === 'habilitado' ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}>
                        {linkedJugador.estado === 'habilitado' ? 'Habilitado' : 'No habilitado'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">DNI: {formatDni(linkedJugador.dni || '')}</p>
                    <p className="text-sm text-muted-foreground">Equipo: {linkedJugador.equipo?.nombre_equipo || '—'}</p>
                    {linkedJugador.categoriaNombre && (
                      <p className="text-sm text-muted-foreground">Categoría: {linkedJugador.categoriaNombre}</p>
                    )}
                    <p className="text-sm text-muted-foreground">Delegado: {delegadoLabel}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No se pudo cargar la información del jugador.</p>
                )}
              </div>
            ) : (
              <div className="border rounded-md p-4 bg-destructive/10 space-y-2">
                <p className="text-sm text-destructive">Este usuario no tiene jugador vinculado.</p>
                {isAdminGeneral && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast({ title: 'Flujo de vinculación', description: 'Esta función aún no está implementada.' })}
                  >
                    Vincular jugador
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* Modules */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-1">Módulos Permitidos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MODULE_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={modules[key]} onCheckedChange={() => toggleModule(key)} />
                  <span>{MODULE_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Admin actions */}
          {isAdminGeneral && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-1">Acciones de Acceso</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => sendRecoveryMutation.mutate()}
                  disabled={sendRecoveryMutation.isPending}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-1" />
                  {sendRecoveryMutation.isPending ? 'Enviando...' : 'Enviar link de recuperación'}
                </Button>
              </div>

              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <Label className="flex items-center gap-1"><KeyRound className="w-4 h-4" /> Asignar contraseña temporal</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Mínimo 8 caracteres"
                    value={tempPwd}
                    onChange={(e) => setTempPwd(e.target.value)}
                  />
                  <Button
                    onClick={() => tempPwdMutation.mutate()}
                    disabled={tempPwdMutation.isPending || tempPwd.length < 8}
                  >
                    {tempPwdMutation.isPending ? 'Aplicando...' : 'Aplicar'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">El usuario será forzado a cambiar la contraseña al iniciar sesión.</p>
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
            {editMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
