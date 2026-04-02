import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink } from 'lucide-react';

export default function BoletinesPublicPage() {
  const [categoriaId, setCategoriaId] = useState<string>('all');

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('id, nombre_categoria').order('nombre_categoria');
      if (error) throw error;
      return data;
    },
  });

  const { data: boletines = [], isLoading } = useQuery({
    queryKey: ['boletines-public', categoriaId],
    queryFn: async () => {
      let query = supabase
        .from('boletines_publicos')
        .select('id, titulo, fecha_publicacion, temporada, archivo_url, categoria:categorias(nombre_categoria)')
        .order('fecha_publicacion', { ascending: false });
      if (categoriaId !== 'all') {
        query = query.eq('categoria_id', categoriaId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Boletines Oficiales</h1>
          <p className="text-muted-foreground mt-2">Liga Veteranos Formosa - Temporada 2026</p>
        </div>

        <div className="flex justify-center mb-6">
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre_categoria}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando boletines...</div>
        ) : boletines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No hay boletines publicados{categoriaId !== 'all' ? ' para esta categoría' : ''}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {boletines.map((b: any) => (
              <Card key={b.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{b.titulo}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{new Date(b.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                        <Badge variant="outline" className="text-xs">{b.categoria?.nombre_categoria}</Badge>
                        <span className="text-xs">Temp. {b.temporada}</span>
                      </div>
                    </div>
                  </div>
                  {b.archivo_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={b.archivo_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" /> Ver
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
