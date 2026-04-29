import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TorneoResultados() {
  const { torneoId } = useParams();

  const { data: equipos } = useQuery({
    queryKey: ["pr-equipos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipos").select("id, nombre_equipo");
      if (error) throw error;
      return new Map((data || []).map((e: any) => [e.id, e.nombre_equipo]));
    },
  });

  const { data: partidos } = useQuery({
    queryKey: ["pr-partidos", torneoId],
    enabled: !!torneoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partidos")
        .select("id, dia, fecha_numero, estado, equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, hubo_penales, penales_local, penales_visitante, ganador_id")
        .eq("torneo_id", torneoId!)
        .in("estado", ["jugado", "cargado", "confirmado"])
        .order("dia", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Resultados</h2>

      {(!partidos || partidos.length === 0) && (
        <p className="text-center text-muted-foreground py-8">Aún no hay resultados cargados.</p>
      )}

      <div className="space-y-3">
        {partidos?.map((p: any) => {
          const local = equipos?.get(p.equipo_local_id) ?? "—";
          const visit = equipos?.get(p.equipo_visitante_id) ?? "—";
          return (
            <Card key={p.id}>
              <CardContent className="py-4 grid grid-cols-12 items-center gap-2">
                <div className="col-span-2 text-xs text-muted-foreground">
                  {p.dia ?? `Fecha ${p.fecha_numero ?? "—"}`}
                </div>
                <div className="col-span-4 text-right font-medium">{local}</div>
                <div className="col-span-2 text-center">
                  <div className="text-2xl font-bold">{p.goles_local} - {p.goles_visitante}</div>
                  {p.hubo_penales && (
                    <div className="text-xs text-muted-foreground">Pen. {p.penales_local}-{p.penales_visitante}</div>
                  )}
                </div>
                <div className="col-span-4 font-medium">{visit}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
