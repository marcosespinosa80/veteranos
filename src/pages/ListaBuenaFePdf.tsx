import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR');
}
function formatBirth(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR');
}
function estadoJugadorLabel(j: any): string {
  if (j.estado === 'expulsado') return 'EXPULSADO';
  if ((j.suspendido_fechas || 0) > 0) return `SUSPENDIDO (${j.suspendido_fechas})`;
  if (j.estado === 'habilitado') return 'HABILITADO';
  return 'NO HABILITADO';
}

export default function ListaBuenaFePdf() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const { data: lista, isLoading } = useQuery({
    queryKey: ['lista-pdf', id],
    enabled: !!id && !loading && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listas_buena_fe')
        .select(`
          *,
          equipo:equipos(nombre_equipo),
          categoria:categorias(nombre_categoria),
          aprobador:profiles!listas_buena_fe_aprobada_por_fkey(nombre, apellido)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['lista-pdf-items', id],
    enabled: !!id && !loading && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lista_buena_fe_items')
        .select(`
          id,
          estado_item,
          jugador:jugadores(
            apellido, nombre, dni, fecha_nacimiento, estado, suspendido_fechas,
            categoria:categorias(nombre_categoria)
          )
        `)
        .eq('lista_id', id!);
      if (error) throw error;
      return data;
    },
  });

  const sorted = useMemo(() => {
    return [...items]
      .filter((it: any) => it.jugador && it.estado_item === 'incluido')
      .sort((a: any, b: any) => {
        const ap = `${a.jugador.apellido} ${a.jugador.nombre}`.toLowerCase();
        const bp = `${b.jugador.apellido} ${b.jugador.nombre}`.toLowerCase();
        return ap.localeCompare(bp);
      });
  }, [items]);

  const aprobada = lista?.estado === 'aprobada';

  // Auto-trigger print once data is ready
  useEffect(() => {
    if (!isLoading && lista && aprobada) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [isLoading, lista, aprobada]);

  if (isLoading || loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  }

  if (!lista) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive font-medium">Lista no encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/listas-buena-fe')}>
          Volver
        </Button>
      </div>
    );
  }

  if (!aprobada) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive font-medium">
          Solo se puede generar el PDF de listas APROBADAS.
        </p>
        <p className="text-sm text-muted-foreground">
          Estado actual: {String(lista.estado).toUpperCase()}
        </p>
        <Button variant="outline" onClick={() => navigate('/listas-buena-fe')}>
          Volver
        </Button>
      </div>
    );
  }

  const generadoEl = new Date().toLocaleString('es-AR');

  return (
    <>
      {/* Print styles scoped via class */}
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .pdf-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
        .pdf-page {
          background: #fff;
          color: #111;
          font-family: 'Inter', system-ui, sans-serif;
          max-width: 210mm;
          margin: 16px auto;
          padding: 18mm 14mm;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .pdf-page h1, .pdf-page h2, .pdf-page p, .pdf-page table { color: #111; }
        .pdf-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .pdf-table th, .pdf-table td { border: 1px solid #333; padding: 4px 6px; text-align: left; vertical-align: top; }
        .pdf-table th { background: #f0f0f0; font-weight: 700; text-transform: uppercase; font-size: 10px; }
        .pdf-table tr { page-break-inside: avoid; }
      `}</style>

      {/* Toolbar (hidden on print) */}
      <div className="no-print sticky top-0 z-10 bg-background border-b p-3 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/listas-buena-fe')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="pdf-page">
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: 10, marginBottom: 14 }}>
          <p style={{ fontSize: 11, letterSpacing: 1, margin: 0, fontWeight: 600 }}>
            LIGA DE VETERANOS DE FÚTBOL DE CATAMARCA
          </p>
          <h1 style={{ fontSize: 22, margin: '6px 0 0', letterSpacing: 1 }}>LISTA DE BUENA FE</h1>
          <p style={{ fontSize: 11, margin: '4px 0 0', color: '#444' }}>
            Temporada {lista.temporada}
          </p>
        </div>

        {/* Datos generales */}
        <table style={{ width: '100%', fontSize: 12, marginBottom: 14, borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', width: '22%', fontWeight: 600 }}>Equipo:</td>
              <td style={{ padding: '4px 0' }}>{lista.equipo?.nombre_equipo || '—'}</td>
              <td style={{ padding: '4px 0', width: '22%', fontWeight: 600 }}>Categoría:</td>
              <td style={{ padding: '4px 0' }}>{lista.categoria?.nombre_categoria || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>Fecha de aprobación:</td>
              <td style={{ padding: '4px 0' }}>{formatDate(lista.fecha_aprobacion)}</td>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>Aprobada por:</td>
              <td style={{ padding: '4px 0' }}>
                {lista.aprobador
                  ? `${lista.aprobador.apellido}, ${lista.aprobador.nombre}`
                  : '—'}
              </td>
            </tr>
            {lista.firmada && (
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 600 }}>Firmada:</td>
                <td style={{ padding: '4px 0' }}>Sí</td>
                <td style={{ padding: '4px 0', fontWeight: 600 }}>Fecha de firma:</td>
                <td style={{ padding: '4px 0' }}>{formatDate(lista.fecha_firma)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Tabla jugadores */}
        <table className="pdf-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>N°</th>
              <th style={{ width: '36%' }}>Apellido y Nombre</th>
              <th style={{ width: '14%' }}>DNI</th>
              <th style={{ width: '12%' }}>Fecha Nac.</th>
              <th style={{ width: '14%' }}>Categoría</th>
              <th style={{ width: '20%' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 12 }}>Sin jugadores incluidos</td></tr>
            ) : (
              sorted.map((it: any, idx: number) => (
                <tr key={it.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>{it.jugador.apellido}, {it.jugador.nombre}</td>
                  <td>{it.jugador.dni}</td>
                  <td>{formatBirth(it.jugador.fecha_nacimiento)}</td>
                  <td>{it.jugador.categoria?.nombre_categoria || '—'}</td>
                  <td>{estadoJugadorLabel(it.jugador)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Firmas */}
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', gap: 30 }}>
          <div style={{ flex: 1, textAlign: 'center', borderTop: '1px solid #333', paddingTop: 6, fontSize: 11 }}>
            Firma del Delegado
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderTop: '1px solid #333', paddingTop: 6, fontSize: 11 }}>
            Firma Liga / Sello
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 26, fontSize: 9, color: '#666', textAlign: 'center', borderTop: '1px solid #ddd', paddingTop: 6 }}>
          Documento generado por el sistema LVFC — {generadoEl}
        </div>
      </div>
    </>
  );
}
