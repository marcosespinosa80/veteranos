import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DniInput } from '@/components/ui/dni-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Pencil, Search, Filter, Upload, X, User, Camera, AlertTriangle, ArrowRightLeft, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Helpers ──

import { formatDni, dniDigits as dniDigitsHelper } from '@/lib/dni';

function dniDigitCount(dni: string): number {
  return dniDigitsHelper(dni).length;
}


function parsePhone(tel: string): { area: string; numero: string } {
  if (!tel) return { area: '', numero: '' };
  const clean = tel.replace(/[^\d]/g, '');
  if (clean.startsWith('54') && clean.length >= 10) {
    const rest = clean.slice(2);
    for (const areaLen of [3, 4, 2]) {
      if (rest.length > areaLen) {
        return { area: rest.slice(0, areaLen), numero: rest.slice(areaLen) };
      }
    }
    return { area: rest, numero: '' };
  }
  if (clean.length > 3) return { area: clean.slice(0, 3), numero: clean.slice(3) };
  return { area: clean, numero: '' };
}

function sanitizeArea(v: string): string {
  const d = v.replace(/\D/g, '');
  return d.startsWith('0') ? d.slice(1) : d;
}
function sanitizeNumero(v: string): string {
  const d = v.replace(/\D/g, '');
  return d.startsWith('15') ? d.slice(2) : d;
}

/** Get deportivo status label */
function getEstadoDeportivo(j: any): { label: string; color: string } {
  if (j.estado === 'expulsado') return { label: 'EXPULSADO', color: 'bg-destructive/15 text-destructive border-destructive/30' };
  if (j.suspendido_fechas > 0) return { label: `SUSPENDIDO (${j.suspendido_fechas} FECHA${j.suspendido_fechas > 1 ? 'S' : ''})`, color: 'bg-warning/15 text-warning border-warning/30' };
  if (j.estado === 'habilitado') return { label: 'HABILITADO', color: 'bg-primary/15 text-primary border-primary/30' };
  return { label: 'NO HABILITADO', color: 'bg-muted text-muted-foreground border-muted' };
}

// ── Types ──

interface JugadorForm {
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  equipo_id: string | null;
  telefono_area: string;
  telefono_numero: string;
  direccion: string;
  estado: 'habilitado' | 'no_habilitado' | 'expulsado';
  suspendido_fechas: number;
  activo_club: boolean;
}

const emptyForm: JugadorForm = {
  nombre: '', apellido: '', dni: '', fecha_nacimiento: '', equipo_id: null,
  telefono_area: '', telefono_numero: '', direccion: '', estado: 'no_habilitado',
  suspendido_fechas: 0, activo_club: true,
};

// ── Validation ──

interface FormErrors {
  nombre?: string;
  apellido?: string;
  dni?: string;
  fecha_nacimiento?: string;
  telefono_area?: string;
  telefono_numero?: string;
}

function validateForm(form: JugadorForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.nombre.trim()) errors.nombre = 'Nombre es obligatorio';
  if (!form.apellido.trim()) errors.apellido = 'Apellido es obligatorio';
  if (!form.dni.trim()) errors.dni = 'DNI es obligatorio';
  else if (dniDigitCount(form.dni) < 7) errors.dni = 'DNI inválido (mín. 7 dígitos)';
  if (!form.fecha_nacimiento) errors.fecha_nacimiento = 'Fecha de nacimiento es obligatoria';

  const hasArea = form.telefono_area.length > 0;
  const hasNum = form.telefono_numero.length > 0;
  if (hasArea || hasNum) {
    if (form.telefono_area.length < 2 || form.telefono_area.length > 4)
      errors.telefono_area = 'Código de área: 2 a 4 dígitos';
    if (form.telefono_numero.length < 6 || form.telefono_numero.length > 8)
      errors.telefono_numero = 'Celular: 6 a 8 dígitos';
  }
  return errors;
}

// ── Component ──

export default function Jugadores() {
  const { role, user, loading, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterEquipo, setFilterEquipo] = useState<string>('all');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JugadorForm>(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [categoriaPreview, setCategoriaPreview] = useState<string>('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === 'admin_general' || role === 'admin_comun';
  const isDelegado = role === 'delegado';
  const canEditEstado = isAdmin || role === 'tribunal';
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const jid = deleteTarget.id;
      // Check related records in parallel
      const [carnets, pases, items, goles, planilla, cargos] = await Promise.all([
        supabase.from('carnets').select('id', { count: 'exact', head: true }).eq('jugador_id', jid),
        supabase.from('pases').select('id', { count: 'exact', head: true }).eq('jugador_id', jid),
        supabase.from('lista_buena_fe_items').select('id', { count: 'exact', head: true }).eq('jugador_id', jid),
        supabase.from('goles_jugador').select('id', { count: 'exact', head: true }).eq('jugador_id', jid),
        supabase.from('planilla_arbitral_items').select('id', { count: 'exact', head: true }).eq('jugador_id', jid),
        supabase.from('cargos').select('id', { count: 'exact', head: true }).eq('jugador_id', jid),
      ]);
      const total = (carnets.count || 0) + (pases.count || 0) + (items.count || 0)
        + (goles.count || 0) + (planilla.count || 0) + (cargos.count || 0);
      if (total > 0) {
        toast({
          title: 'No se puede eliminar',
          description: 'Este jugador tiene movimientos registrados. Podés deshabilitarlo o marcarlo como no habilitado.',
          variant: 'destructive',
        });
        setDeleteTarget(null);
        setDeleting(false);
        return;
      }
      const { error } = await supabase.from('jugadores').delete().eq('id', jid);
      if (error) throw error;
      toast({ title: 'Jugador eliminado' });
      queryClient.invalidateQueries({ queryKey: ['jugadores'] });
      queryClient.invalidateQueries({ queryKey: ['jugador-counts'] });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;

  // ── Queries ──

  const { data: jugadores = [], isLoading } = useQuery({
    queryKey: ['jugadores', user?.id, role, profile?.equipo_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jugadores')
        .select('*, equipo:equipos!jugadores_equipo_id_fkey(nombre_equipo, estado), categoria:categorias(nombre_categoria)')
        .order('apellido');
      if (error) throw error;
      return data;
    },
    enabled: !loading && !!user,
  });

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipos').select('id, nombre_equipo').eq('estado', 'activo').order('nombre_equipo');
      if (error) throw error;
      return data;
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('id, nombre_categoria').order('nombre_categoria');
      if (error) throw error;
      return data;
    },
  });

  // ── Category preview ──

  useEffect(() => {
    if (!form.fecha_nacimiento) { setCategoriaPreview(''); return; }
    const calcular = async () => {
      const { data, error } = await supabase.rpc('calcular_categoria', { p_fecha_nacimiento: form.fecha_nacimiento });
      if (error || !data) { setCategoriaPreview('Sin categoría'); return; }
      const cat = categorias.find((c) => c.id === data);
      setCategoriaPreview(cat?.nombre_categoria || 'Sin categoría');
    };
    calcular();
  }, [form.fecha_nacimiento, categorias]);

  // ── Photo ──

  const uploadFoto = async (jugadorId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `jugadores/${jugadorId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('fotos-jugadores')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('fotos-jugadores').getPublicUrl(path);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const resizeImage = (file: File, maxSize = 800): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxSize && height <= maxSize) {
          resolve(file);
          return;
        }
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Solo se permiten imágenes', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'La imagen no puede superar 5 MB', variant: 'destructive' });
      return;
    }
    const resized = await resizeImage(file, 800);
    setFotoFile(resized);
    setFotoPreview(URL.createObjectURL(resized));
  };

  // ── Save ──

  const saveMutation = useMutation({
    mutationFn: async (data: JugadorForm & { id?: string }) => {
      const telefono = data.telefono_area && data.telefono_numero
        ? `+54 ${data.telefono_area} ${data.telefono_numero}`
        : null;

      const payload = {
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        dni: data.dni.trim(),
        fecha_nacimiento: data.fecha_nacimiento,
        equipo_id: isDelegado ? (profile?.equipo_id || null) : (data.equipo_id || null),
        telefono,
        direccion: data.direccion.trim() || null,
        estado: data.estado,
        suspendido_fechas: data.suspendido_fechas,
        activo_club: data.activo_club,
      };

      let jugadorId = data.id;
      if (data.id) {
        const { error } = await supabase.from('jugadores').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from('jugadores').insert(payload).select('id').single();
        if (error) throw error;
        jugadorId = inserted.id;
      }

      if (fotoFile && jugadorId) {
        const fotoUrl = await uploadFoto(jugadorId, fotoFile);
        const { error: updateError } = await supabase.from('jugadores').update({ foto_url: fotoUrl }).eq('id', jugadorId);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jugadores'] });
      queryClient.invalidateQueries({ queryKey: ['jugador-counts'] });
      queryClient.invalidateQueries({ queryKey: ['carnets'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setTouched({});
      setCategoriaPreview('');
      setFotoFile(null);
      setFotoPreview(null);
      toast({ title: editingId ? 'Jugador actualizado' : 'Jugador creado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // ── Open dialogs ──

  const openCreate = () => {
    setForm({ ...emptyForm, equipo_id: isDelegado ? (profile?.equipo_id || null) : null });
    setEditingId(null);
    setTouched({});
    setCategoriaPreview('');
    setFotoFile(null);
    setFotoPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (j: any) => {
    const phone = parsePhone(j.telefono || '');
    setForm({
      nombre: j.nombre,
      apellido: j.apellido,
      dni: j.dni,
      fecha_nacimiento: j.fecha_nacimiento,
      equipo_id: j.equipo_id,
      telefono_area: phone.area,
      telefono_numero: phone.numero,
      direccion: j.direccion || '',
      estado: j.estado,
      suspendido_fechas: j.suspendido_fechas || 0,
      activo_club: j.activo_club ?? true,
    });
    setCategoriaPreview(j.categoria?.nombre_categoria || 'Sin categoría');
    setFotoFile(null);
    setFotoPreview(j.foto_url || null);
    setEditingId(j.id);
    setTouched({});
    setDialogOpen(true);
  };

  // ── Filter ──

  const filtered = jugadores.filter((j: any) => {
    const searchDigits = search.replace(/\D/g, '');
    const matchSearch =
      `${j.nombre} ${j.apellido} ${j.dni}`.toLowerCase().includes(search.toLowerCase()) ||
      (searchDigits.length > 0 && (j.dni || '').replace(/\D/g, '').includes(searchDigits));
    const matchEquipo = filterEquipo === 'all' || j.equipo_id === filterEquipo;
    const matchCategoria = filterCategoria === 'all' || j.categoria_id === filterCategoria;
    return matchSearch && matchEquipo && matchCategoria;
  });

  // ── Inline error helper ──
  const FieldError = ({ field }: { field: keyof FormErrors }) => {
    if (!touched[field] || !errors[field]) return null;
    return <p className="text-xs text-destructive mt-1">{errors[field]}</p>;
  };

  // ── Submit handler ──
  const editingPlayer = editingId ? jugadores.find((j: any) => j.id === editingId) : null;
  const editingClubInactivo = editingPlayer?.equipo?.estado === 'inactivo';
  const fotoRequired = !editingId && !fotoFile && !fotoPreview;
  const handleSubmit = () => {
    setTouched({ nombre: true, apellido: true, dni: true, fecha_nacimiento: true, telefono_area: true, telefono_numero: true });
    if (fotoRequired) {
      toast({ title: 'La foto es obligatoria para crear el jugador', variant: 'destructive' });
      return;
    }
    if (hasErrors) return;
    // Force activo_club=false if club is inactive
    const payload = editingClubInactivo ? { ...form, activo_club: false } : form;
    saveMutation.mutate({ ...payload, id: editingId || undefined });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o DNI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {(isAdmin || role === 'delegado') && (
            <Button onClick={openCreate} className="shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Jugador
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterEquipo} onValueChange={setFilterEquipo}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Equipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {equipos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre_categoria}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterEquipo !== 'all' || filterCategoria !== 'all') && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterEquipo('all'); setFilterCategoria('all'); }}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} jugador{filtered.length !== 1 ? 'es' : ''}</p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No se encontraron jugadores</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apellido y Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">DNI</TableHead>
                  <TableHead className="hidden md:table-cell">Equipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Categoría</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha Nac.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">Club</TableHead>
                  <TableHead className="hidden sm:table-cell">Delegado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((j: any) => {
                  const deportivo = getEstadoDeportivo(j);
                  const clubInactivo = j.equipo?.estado === 'inactivo';
                  return (
                    <TableRow key={j.id} className={clubInactivo ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{j.apellido}, {j.nombre}</span>
                          {clubInactivo && (
                            <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] mt-1 w-fit">
                              <AlertTriangle className="w-3 h-3 mr-1" /> CLUB DADO DE BAJA
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{j.dni}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{j.equipo?.nombre_equipo || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{j.categoria?.nombre_categoria || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {j.fecha_nacimiento ? new Date(j.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={deportivo.color}>
                          {deportivo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={(j.activo_club && !clubInactivo)
                          ? 'bg-primary/15 text-primary border-primary/30 text-xs'
                          : 'bg-destructive/15 text-destructive border-destructive/30 text-xs'
                        }>
                          {clubInactivo ? 'INACTIVO (CLUB)' : (j.activo_club ? 'ACTIVO' : 'INACTIVO')}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {j.es_delegado && !clubInactivo ? (
                          <Badge variant="outline" className="bg-accent/15 text-accent-foreground border-accent/30 text-xs">
                            Delegado
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {clubInactivo && (isAdmin || isDelegado) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              onClick={() => navigate(`/pases?jugador=${j.id}`)}
                              title="Iniciar pase a otro club"
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" /> Pase
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => openEdit(j)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Jugador' : 'Nuevo Jugador'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los datos del jugador.' : 'Completá los datos para registrar un nuevo jugador.'}
            </DialogDescription>
          </DialogHeader>

          {editingClubInactivo && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Club dado de baja</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>Este club está dado de baja. El jugador no puede estar ACTIVO. Solo se permite iniciar un pase.</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={() => { setDialogOpen(false); navigate(`/pases?jugador=${editingId}`); }}
                >
                  <ArrowRightLeft className="w-3 h-3 mr-1" /> Iniciar Pase
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Photo upload */}
          <div className="space-y-1 pb-2">
            <Label>
              Foto {!editingId && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex items-center gap-4">
              <div className={`relative w-20 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0 border ${fotoRequired ? 'border-destructive' : ''}`}>
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-3 h-3 mr-1" /> Sacar foto
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3 h-3 mr-1" /> {fotoPreview ? 'Cambiar foto' : 'Subir foto'}
                  </Button>
                  {fotoFile && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setFotoFile(null); setFotoPreview(editingId ? (jugadores.find((j: any) => j.id === editingId)?.foto_url || null) : null); }}>
                      <X className="w-3 h-3 mr-1" /> Quitar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG o PNG, máx 5 MB. En celular se abre la cámara.</p>
                {fotoRequired && <p className="text-xs text-destructive">La foto es obligatoria</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })}
                onBlur={() => setTouched({ ...touched, nombre: true })}
                placeholder="JUAN"
              />
              <FieldError field="nombre" />
            </div>

            {/* Apellido */}
            <div className="space-y-1">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value.toUpperCase() })}
                onBlur={() => setTouched({ ...touched, apellido: true })}
                placeholder="PÉREZ"
              />
              <FieldError field="apellido" />
            </div>

            {/* DNI */}
            <div className="space-y-1">
              <Label htmlFor="dni">DNI *</Label>
              <DniInput
                id="dni"
                value={form.dni}
                onChange={(v) => setForm({ ...form, dni: v })}
                onBlur={() => setTouched({ ...touched, dni: true })}
              />
              <FieldError field="dni" />
            </div>

            {/* Fecha Nacimiento */}
            <div className="space-y-1">
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
              <Input
                id="fecha_nacimiento"
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                onBlur={() => setTouched({ ...touched, fecha_nacimiento: true })}
              />
              <FieldError field="fecha_nacimiento" />
            </div>

            {/* Categoría (read-only) */}
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Input
                value={categoriaPreview || (form.fecha_nacimiento ? 'Calculando...' : 'Se asigna por fecha de nacimiento')}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Equipo */}
            <div className="space-y-1">
              <Label>Equipo</Label>
              {isDelegado ? (
                <Input value={equipos.find(e => e.id === profile?.equipo_id)?.nombre_equipo || 'Tu equipo'} disabled />
              ) : (
                <Select value={form.equipo_id || 'none'} onValueChange={(v) => setForm({ ...form, equipo_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Sin equipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin equipo</SelectItem>
                    {equipos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre_equipo}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Estado deportivo */}
            <div className="space-y-1">
              <Label>Estado (deportivo)</Label>
              {canEditEstado ? (
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_habilitado">No habilitado</SelectItem>
                    <SelectItem value="habilitado">Habilitado</SelectItem>
                    <SelectItem value="expulsado">Expulsado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.estado === 'habilitado' ? 'Habilitado' : form.estado === 'expulsado' ? 'Expulsado' : 'No habilitado'} disabled className="bg-muted" />
              )}
            </div>

            {/* Activo Club (admin/tribunal only) */}
            {canEditEstado && (
              <div className="space-y-1">
                <Label>Activo (Club)</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={editingClubInactivo ? false : form.activo_club}
                    disabled={editingClubInactivo}
                    onCheckedChange={(v) => setForm({ ...form, activo_club: v })}
                  />
                  <span className="text-sm">
                    {editingClubInactivo ? 'Inactivo (club dado de baja)' : (form.activo_club ? 'Activo' : 'Inactivo')}
                  </span>
                </div>
              </div>
            )}

            {/* Suspendido fechas (admin/tribunal only) */}
            {canEditEstado && (
              <div className="space-y-1">
                <Label htmlFor="suspendido_fechas">Fechas de suspensión</Label>
                <Input
                  id="suspendido_fechas"
                  type="number"
                  min="0"
                  max="99"
                  value={form.suspendido_fechas ?? 0}
                  onChange={(e) => setForm({ ...form, suspendido_fechas: Math.max(0, Math.min(99, parseInt(e.target.value) || 0)) })}
                  placeholder="0"
                />
                <p className="text-[10px] text-muted-foreground">0 = sin suspensión</p>
              </div>
            )}

            {/* Teléfono: 2 campos */}
            <div className="space-y-1 sm:col-span-2">
              <Label>Teléfono</Label>
              <div className="flex items-start gap-2">
                <div className="space-y-1 w-28">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground shrink-0">+54</span>
                    <Input
                      value={form.telefono_area}
                      onChange={(e) => setForm({ ...form, telefono_area: sanitizeArea(e.target.value).slice(0, 4) })}
                      onBlur={() => setTouched({ ...touched, telefono_area: true })}
                      placeholder="383"
                      maxLength={4}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Área (sin 0)</p>
                  <FieldError field="telefono_area" />
                </div>
                <div className="space-y-1 flex-1">
                  <Input
                    value={form.telefono_numero}
                    onChange={(e) => setForm({ ...form, telefono_numero: sanitizeNumero(e.target.value).slice(0, 8) })}
                    onBlur={() => setTouched({ ...touched, telefono_numero: true })}
                    placeholder="5123456"
                    maxLength={8}
                  />
                  <p className="text-[10px] text-muted-foreground">Celular (sin 15)</p>
                  <FieldError field="telefono_numero" />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending || fotoRequired}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
