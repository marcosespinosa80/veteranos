import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, UserCog } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getRoleLabel } from '@/lib/navigation';
import type { UserRole } from '@/lib/navigation';

interface UserForm {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  role: string;
  equipo_id: string | null;
}

const emptyForm: UserForm = { email: '', password: '', nombre: '', apellido: '', role: 'admin_comun', equipo_id: null };

const roleOptions: { value: string; label: string }[] = [
  { value: 'admin_general', label: 'Administrador General' },
  { value: 'admin_comun', label: 'Administrador' },
  { value: 'delegado', label: 'Delegado' },
  { value: 'arbitro', label: 'Árbitro' },
  { value: 'tribunal', label: 'Tribunal' },
];

export default function Usuarios() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, nombre, apellido, email, activo, equipo_id, equipo:equipos(nombre_equipo)')
        .order('apellido');
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase.from('user_roles').select('user_id, role');
      if (rErr) throw rErr;

      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
      return (profiles || []).map((p: any) => ({ ...p, role: roleMap.get(p.id) || 'sin_rol' }));
    },
  });

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipos').select('id, nombre_equipo').eq('estado', 'activo').order('nombre_equipo');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const { data: res, error } = await supabase.functions.invoke('create-user', {
        body: { email: data.email, password: data.password, nombre: data.nombre, apellido: data.apellido, role: data.role },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);

      // If delegado, set equipo_id
      if (data.role === 'delegado' && data.equipo_id && res?.user_id) {
        await supabase.from('profiles').update({ equipo_id: data.equipo_id }).eq('id', res.user_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: 'Usuario creado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ userId, role, equipo_id }: { userId: string; role: string; equipo_id: string | null }) => {
      // Update role
      const { error: rErr } = await supabase.from('user_roles').update({ role: role as any }).eq('user_id', userId);
      if (rErr) throw rErr;
      // Update equipo_id
      const { error: pErr } = await supabase.from('profiles').update({ equipo_id: role === 'delegado' ? equipo_id : null }).eq('id', userId);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setDialogOpen(false);
      setEditingUser(null);
      toast({ title: 'Usuario actualizado' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const openCreate = () => { setForm(emptyForm); setEditingUser(null); setDialogOpen(true); };
  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({ email: u.email || '', password: '', nombre: u.nombre, apellido: u.apellido, role: u.role, equipo_id: u.equipo_id });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nuevo Usuario</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No hay usuarios</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden md:table-cell">Equipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.apellido}, {u.nombre}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {u.role !== 'sin_rol' ? getRoleLabel(u.role as UserRole) : 'Sin rol'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{u.equipo?.nombre_equipo || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={u.activo ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription>{editingUser ? 'Cambiá el rol o equipo del usuario.' : 'Completá los datos para crear un nuevo usuario.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingUser && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido *</Label>
                    <Input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, equipo_id: v === 'delegado' ? form.equipo_id : null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.role === 'delegado' && (
              <div className="space-y-2">
                <Label>Equipo</Label>
                <Select value={form.equipo_id || 'none'} onValueChange={(v) => setForm({ ...form, equipo_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin equipo</SelectItem>
                    {equipos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            {editingUser ? (
              <Button
                onClick={() => editMutation.mutate({ userId: editingUser.id, role: form.role, equipo_id: form.equipo_id })}
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            ) : (
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.email || !form.password || !form.nombre.trim() || !form.apellido.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
