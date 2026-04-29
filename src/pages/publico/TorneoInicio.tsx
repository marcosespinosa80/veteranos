import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TorneoInicio() {
  const { torneoId } = useParams();

  const { data: torneo } = useQuery({
    queryKey: ["public-torneo", torneoId],
    enabled: !!torneoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("torneos")
        .select("id, nombre, estado, temporadas(anio)")
        .eq("id", torneoId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: cats } = useQuery({
    queryKey: ["public-torneo-cats", torneoId],
    enabled: !!torneoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("torneo_categorias")
        .select("id, estado, categorias(nombre_categoria), zonas(id)")
        .eq("torneo_id", torneoId!);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: proximos } = useQuery({
    queryKey: ["public-torneo-proximos", torneoId],
    enabled: !!torneoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partidos")
        .select("id, dia, hora, estado, goles_local, goles_visitante, equipo_local_id, equipo_visitante_id")
        .eq("torneo_id", torneoId!)
        .eq("estado", "programado")
        .order("dia", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{torneo?.nombre ?? "Torneo"}</h2>
        <p className="text-muted-foreground">
          Temporada {torneo?.temporadas?.anio ?? "—"} · <Badge variant="outline" className="capitalize">{torneo?.estado}</Badge>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Categorías en juego</CardTitle></CardHeader>
          <CardContent>
            {!cats || cats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin categorías configuradas.</p>
            ) : (
              <ul className="space-y-2">
                {cats.map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span>{c.categorias?.nombre_categoria}</span>
                    <Badge variant="secondary">{c.zonas?.length ?? 0} zona(s)</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Próximos partidos</CardTitle></CardHeader>
          <CardContent>
            {!proximos || proximos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin partidos programados.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {proximos.map((p: any) => (
                  <li key={p.id} className="flex justify-between border-b pb-2 last:border-0">
                    <span>{p.dia ?? "Sin fecha"} {p.hora ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
