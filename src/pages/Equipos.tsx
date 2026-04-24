import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { ClubCard } from '@/components/clubes/ClubCard';
import { ClubFormDialog } from '@/components/clubes/ClubFormDialog';
import { PlantelDrawer } from '@/components/clubes/PlantelDrawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

export default function Equipos() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [plantelEquipo, setPlantelEquipo] = useState<any>(null);
  const [toggleTarget, setToggleTarget] = useState<any>(null);
  const isAdmin = role === 'admin_general' || role === 'admin_comun';

  const { data: equipos = [], isLoading } = useQuery({
    queryKey: ['equipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos')
        .select('*, delegado1:jugadores!equipos_delegado_1_jugador_fkey(id, nombre, apellido), delegado2:jugadores!equipos_delegado_2_jugador_fkey(id, nombre, apellido)')
        .order('nombre_equipo');
      if (error) throw error;
      return data;
    },
  });

  // All equipo_categoria for 2026 with category names
  const { data: equipoCategoriasMap = {} } = useQuery({
    queryKey: ['equipo-categorias-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipo_categoria')
        .select('equipo_id, categoria_id, categorias(id, nombre_categoria)')
        .eq('temporada', 2026);
      if (error) throw error;
      const map: Record<string, { id: string; nombre_categoria: string }[]> = {};
      data.forEach((d: any) => {
        if (!map[d.equipo_id]) map[d.equipo_id] = [];
        if (d.categorias) map[d.equipo_id].push(d.categorias);
      });
      return map;
    },
  });

  const { data: jugadorCounts = {} } = useQuery({
    queryKey: ['jugador-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('jugadores').select('equipo_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((j) => {
        if (j.equipo_id) counts[j.equipo_id] = (counts[j.equipo_id] || 0) + 1;
      });
      return counts;
    },
  });

  const openCreate = () => { setEditingId(null); setEditingData(null); setDialogOpen(true); };
  const openEdit = (eq: any) => { setEditingId(eq.id); setEditingData(eq); setDialogOpen(true); };

  const toggleEstadoMutation = useMutation({
    mutationFn: async (eq: any) => {
      const nuevo = eq.estado === 'activo' ? 'inactivo' : 'activo';
      const { error } = await supabase.from('equipos').update({ estado: nuevo }).eq('id', eq.id);
      if (error) throw error;
      return nuevo;
    },
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['jugadores'] });
      queryClient.invalidateQueries({ queryKey: ['jugador-counts'] });
      toast({
        title: nuevo === 'inactivo'
          ? 'Club dado de baja. Jugadores marcados como inactivos.'
          : 'Club activado',
      });
      setToggleTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setToggleTarget(null);
    },
  });

  // Sort: active first, then by name
  const filtered = equipos
    .filter((e: any) => e.nombre_equipo.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      if (a.estado !== b.estado) return a.estado === 'activo' ? -1 : 1;
      return a.nombre_equipo.localeCompare(b.nombre_equipo);
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">CLUBES</h2>
        <p className="text-sm text-muted-foreground">Clubes registrados en la liga</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar club..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Nuevo Club
          </Button>
        )}
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No se encontraron clubes</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((eq: any) => (
            <ClubCard
              key={eq.id}
              equipo={eq}
              categorias={equipoCategoriasMap[eq.id] || []}
              jugadorCount={jugadorCounts[eq.id] || 0}
              isAdmin={isAdmin}
              onEdit={() => openEdit(eq)}
              onViewPlantel={() => setPlantelEquipo(eq)}
              onToggleEstado={() => setToggleTarget(eq)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ClubFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        initialData={editingData}
      />

      {/* Plantel Drawer */}
      <PlantelDrawer
        open={!!plantelEquipo}
        onOpenChange={(open) => { if (!open) setPlantelEquipo(null); }}
        equipo={plantelEquipo}
      />

      {/* Toggle estado confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.estado === 'activo' ? 'Desactivar' : 'Activar'} club
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmás {toggleTarget?.estado === 'activo' ? 'desactivar' : 'activar'} el club <strong>{toggleTarget?.nombre_equipo}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleTarget && toggleEstadoMutation.mutate(toggleTarget)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
