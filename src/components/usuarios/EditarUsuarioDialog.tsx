import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { DniInput } from '@/components/ui/dni-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, AlertCircle, Link2 } from 'lucide-react';
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
  user: any; // The user being edited
}

export default function EditarUsuarioDialog({ open, onOpenChange, user }: Props) {
  const queryClient = useQueryClient();

  const [role, setRole] = useState<UserRole>(user?.role || 'admin_comun');
  const [activo, setActivo] = useState(user?.activo ?? true);
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(() => {
    // Initialize from user's existing permissions or role defaults
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

  // Delegado state
  const [dniSearch, setDniSearch] = useState('');
  const [jugadorFound, setJugadorFound] = useState<any>(null);
  const [jugadorError, setJugadorError] = useState('');
  const [delegadoPosicion, setDelegadoPosicion] = useState<'delegado_1' | 'delegado_2' | ''>('');
  const [vinculado, setVinculado] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setModules(getDefaultModules(newRole));
  };

  const toggleModule = (key: ModuleKey) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const searchJugador = async () => {
    if (!dniSearch.trim()) return;
    setSearching(true);
    setJugadorError('');
    setJugadorFound(null);
    setVinculado(false);

    const { data, error } = await supabase
      .from('jugadores')
      .select('id, nombre, apellido, dni, estado, equipo_id, equipo:equipos(nombre_equipo)')
      .eq('dni', dniSearch.trim())
      .maybeSingle();

    setSearching(false);
    if (error) { setJugadorError('Error al buscar'); return; }
    if (!data) { setJugadorError('Jugador no encontrado'); return; }
    if (data.estado !== 'habilitado') { setJugadorError('Jugador no habilitado'); return; }
    if (!data.equipo_id) { setJugadorError('Jugador sin equipo'); return; }
    setJugadorFound(data);
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      const userId = user.id;

      // Update role
      await supabase.from('user_roles').update({ role: role as any }).eq('user_id', userId);

      // Update activo & equipo_id
      const profileUpdate: any = { activo };
      if (role === 'delegado' && jugadorFound) {
        profileUpdate.equipo_id = jugadorFound.equipo_id;
      } else if (role !== 'delegado') {
        profileUpdate.equipo_id = null;
      }
      await supabase.from('profiles').update(profileUpdate).eq('id', userId);

      // Upsert module permissions - delete old then insert new
      await supabase.from('user_module_permissions').delete().eq('user_id', userId);
      const rows = MODULE_KEYS.map((k) => ({ user_id: userId, module_key: k, enabled: modules[k] }));
      await supabase.from('user_module_permissions').insert(rows);

      // Delegado position assignment
      if (role === 'delegado' && jugadorFound && vinculado && delegadoPosicion) {
        const updateField = delegadoPosicion === 'delegado_1'
          ? { delegado_1: jugadorFound.id }
          : { delegado_2: jugadorFound.id };
        await supabase.from('equipos').update(updateField).eq('id', jugadorFound.equipo_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      onOpenChange(false);
      toast({ title: 'Usuario actualizado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario: {user?.apellido}, {user?.nombre}</DialogTitle>
          <DialogDescription>Modificá el rol, permisos o estado del usuario.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Delegado linking */}
          {role === 'delegado' && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-1">Vinculación de Delegado</h3>
              <div className="flex gap-2">
                <DniInput
                  placeholder="DNI del jugador"
                  value={dniSearch}
                  onChange={(v) => { setDniSearch(v); setJugadorFound(null); setJugadorError(''); setVinculado(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && searchJugador()}
                />
                <Button variant="outline" onClick={searchJugador} disabled={searching || !dniSearch.trim()}>
                  <Search className="w-4 h-4 mr-1" /> Buscar
                </Button>
              </div>

              {jugadorError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4" /> {jugadorError}
                </div>
              )}

              {jugadorFound && (
                <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{jugadorFound.apellido}, {jugadorFound.nombre}</p>
                    <Badge variant="outline" className="bg-primary/15 text-primary">Habilitado</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Equipo: {jugadorFound.equipo?.nombre_equipo || '—'}</p>
                  <div className="space-y-2">
                    <Label>Posición</Label>
                    <Select value={delegadoPosicion} onValueChange={(v) => setDelegadoPosicion(v as any)}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delegado_1">Delegado 1</SelectItem>
                        <SelectItem value="delegado_2">Delegado 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!vinculado ? (
                    <Button variant="outline" onClick={() => setVinculado(true)} disabled={!delegadoPosicion} className="w-full">
                      <Link2 className="w-4 h-4 mr-1" /> Vincular
                    </Button>
                  ) : (
                    <p className="text-center text-sm text-primary font-medium">✓ Vinculado</p>
                  )}
                </div>
              )}
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
