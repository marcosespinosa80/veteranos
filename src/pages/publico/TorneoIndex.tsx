import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Calendar } from "lucide-react";

export default function TorneoIndex() {
  const { data: torneos, isLoading } = useQuery({
    queryKey: ["public-torneos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("torneos")
        .select("id, nombre, estado, temporada_id, temporadas(anio)")
        .in("estado", ["configuracion", "en_curso", "activo", "finalizado"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Trophy className="h-16 w-16 text-accent mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">Torneos Activos</h2>
        <p className="text-muted-foreground">Seleccioná un torneo para ver fixture, posiciones y resultados.</p>
      </div>

      {isLoading && <p className="text-center text-muted-foreground">Cargando…</p>}

      {!isLoading && (!torneos || torneos.length === 0) && (
        <p className="text-center text-muted-foreground">No hay torneos disponibles.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {torneos?.map((t: any) => (
          <Link key={t.id} to={`/torneo/${t.id}`}>
            <Card className="hover:border-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Temporada {t.temporadas?.anio ?? "—"} · <span className="capitalize">{t.estado}</span>
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
