import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Link2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getRoleLabel, type UserRole } from '@/lib/navigation';
import { MODULE_KEYS, MODULE_LABELS, getDefaultModules, type ModuleKey } from '@/lib/modules';

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

  // Form state
  const [role, setRole] = useState<UserRole>('admin_comun');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activo, setActivo] = useState(true);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(getDefaultModules('admin_comun'));

  // Delegado state
  const [dniSearch, setDniSearch] = useState('');
  const [jugadorFound, setJugadorFound] = useState<any>(null);
  const [jugadorError, setJugadorError] = useState('');
  const [delegadoPosicion, setDelegadoPosicion] = useState<'delegado_1' | 'delegado_2' | ''>('');
  const [vinculado, setVinculado] = useState(false);
  const [searching, setSearching] = useState(false);

  const resetForm = () => {
    setRole('admin_comun');
    setUsername('');
    setPassword('');
    setActivo(true);
    setNombre('');
    setApellido('');
    setModules(getDefaultModules('admin_comun'));
    setDniSearch('');
    setJugadorFound(null);
    setJugadorError('');
    setDelegadoPosicion('');
    setVinculado(false);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setModules(getDefaultModules(newRole));
    if (newRole !== 'delegado') {
      setDniSearch('');
      setJugadorFound(null);
      setJugadorError('');
      setDelegadoPosicion('');
      setVinculado(false);
    }
  };

  const toggleModule = (key: ModuleKey) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const searchJugador = async () => {
    const dniDigits = dniSearch.replace(/\D/g, '');
    if (!dniDigits) return;
    setSearching(true);
    setJugadorError('');
    setJugadorFound(null);
    setVinculado(false);

    // Fetch all and match by digits (handles DNIs stored with/without dots)
    const { data, error } = await supabase
      .from('jugadores')
      .select('id, nombre, apellido, dni, estado, equipo_id, suspendido_fechas, categoria:categorias(nombre_categoria), equipo:equipos!jugadores_equipo_id_fkey(nombre_equipo)');

    setSearching(false);

    if (error) {
      setJugadorError('Error al buscar jugador');
      return;
    }

    const match = (data || []).find((j: any) => (j.dni || '').replace(/\D/g, '') === dniDigits);

    if (!match) {
      setJugadorError('Jugador no encontrado');
      return;
    }
    if (match.estado !== 'habilitado') {
      setJugadorError('El jugador no está habilitado, no puede ser delegado');
      return;
    }
    if ((match.suspendido_fechas || 0) > 0) {
      setJugadorError(`Jugador suspendido (${match.suspendido_fechas} fecha${match.suspendido_fechas !== 1 ? 's' : ''}), no puede ser delegado`);
      return;
    }
    if (!match.equipo_id) {
      setJugadorError('Jugador sin club asignado, no se puede vincular');
      return;
    }

    setJugadorFound(match);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const modulesList = MODULE_KEYS.map((k) => ({ module_key: k, enabled: modules[k] }));

      const payload: any = {
        email_or_username: username.trim(),
        password,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        role,
        activo,
        equipo_id: null,
        jugador_id_delegado: null,
        delegado_posicion: null,
        modules: modulesList,
      };

      if (role === 'delegado' && jugadorFound) {
        payload.equipo_id = jugadorFound.equipo_id;
        payload.jugador_id_delegado = jugadorFound.id;
        payload.delegado_posicion = delegadoPosicion;
      }

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

  const canSubmit = () => {
    if (!username.trim() || password.length < 8 || !nombre.trim() || !apellido.trim()) return false;
    if (role === 'delegado') {
      if (!jugadorFound || !vinculado || !delegadoPosicion) return false;
    }
    return true;
  };

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
          <DialogDescription>Completá todos los datos para dar de alta un nuevo usuario del sistema.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* A) CONFIGURACIÓN DE ACCESO */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1">Configuración de Acceso</h3>
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
              <div className="space-y-2 flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={activo} onCheckedChange={setActivo} id="activo-switch" />
                  <Label htmlFor="activo-switch">{activo ? 'Activo' : 'Inactivo'}</Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Usuario (email o DNI) *</Label>
              <Input
                placeholder="ejemplo@mail.com o 12345678"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Si ingresás un DNI, se generará un email interno automáticamente.</p>
            </div>
            <div className="space-y-2">
              <Label>Contraseña inicial * (mínimo 8 caracteres)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </div>
          </section>

          {/* B) IDENTIDAD */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1">Identidad</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Apellido *</Label>
                <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
              </div>
            </div>
          </section>

          {/* C) MÓDULOS PERMITIDOS */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1">Módulos Permitidos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MODULE_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={modules[key]}
                    onCheckedChange={() => toggleModule(key)}
                  />
                  <span>{MODULE_LABELS[key]}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Los permisos por defecto se cargan según el rol. Podés modificarlos manualmente.</p>
          </section>

          {/* D) VINCULACIÓN DELEGADO */}
          {role === 'delegado' && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-1">Vinculación de Delegado</h3>
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>DNI del jugador *</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ingresá el DNI"
                      value={dniSearch}
                      onChange={(e) => {
                        setDniSearch(e.target.value);
                        setJugadorFound(null);
                        setJugadorError('');
                        setVinculado(false);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && searchJugador()}
                    />
                    <Button variant="outline" onClick={searchJugador} disabled={searching || !dniSearch.trim()}>
                      <Search className="w-4 h-4 mr-1" /> Buscar
                    </Button>
                  </div>
                </div>
              </div>

              {jugadorError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {jugadorError}
                </div>
              )}

              {jugadorFound && (
                <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{jugadorFound.apellido}, {jugadorFound.nombre}</p>
                      <p className="text-sm text-muted-foreground">DNI: {jugadorFound.dni}</p>
                    </div>
                    <Badge variant="outline" className="bg-primary/15 text-primary">Habilitado</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Equipo: </span>
                    <span className="font-medium">{jugadorFound.equipo?.nombre_equipo || '—'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                      <Label>Club asignado</Label>
                      <Input value={jugadorFound.equipo?.nombre_equipo || ''} disabled className="bg-muted" />
                    </div>
                  </div>

                  {!vinculado ? (
                    <Button
                      variant="outline"
                      onClick={() => setVinculado(true)}
                      disabled={!delegadoPosicion}
                      className="w-full"
                    >
                      <Link2 className="w-4 h-4 mr-1" /> Vincular
                    </Button>
                  ) : (
                    <div className="text-center text-sm text-primary font-medium py-1">
                      ✓ Jugador vinculado como {delegadoPosicion === 'delegado_1' ? 'Delegado 1' : 'Delegado 2'}
                    </div>
                  )}
                </div>
              )}
            </section>
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
