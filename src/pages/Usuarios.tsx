import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil } from 'lucide-react';
import { getRoleLabel } from '@/lib/navigation';
import type { UserRole } from '@/lib/navigation';
import NuevoUsuarioWizard from '@/components/usuarios/NuevoUsuarioWizard';
import EditarUsuarioDialog from '@/components/usuarios/EditarUsuarioDialog';

export default function Usuarios() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, nombre, apellido, email, username, activo, equipo_id, equipo:equipos(nombre_equipo)')
        .order('apellido');
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase.from('user_roles').select('user_id, role');
      if (rErr) throw rErr;

      const { data: perms } = await supabase.from('user_module_permissions').select('user_id, module_key, enabled');

      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
      const permMap = new Map<string, any[]>();
      (perms || []).forEach((p: any) => {
        if (!permMap.has(p.user_id)) permMap.set(p.user_id, []);
        permMap.get(p.user_id)!.push(p);
      });

      return (profiles || []).map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) || 'sin_rol',
        permissions: permMap.get(p.id) || [],
      }));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Usuario
        </Button>
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
                  <TableHead className="hidden sm:table-cell">Usuario</TableHead>
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
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {u.username || u.email || '—'}
                    </TableCell>
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
                      <Button size="icon" variant="ghost" onClick={() => setEditUser(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NuevoUsuarioWizard open={createOpen} onOpenChange={setCreateOpen} />
      {editUser && (
        <EditarUsuarioDialog
          open={!!editUser}
          onOpenChange={(v) => { if (!v) setEditUser(null); }}
          user={editUser}
        />
      )}
    </div>
  );
}
