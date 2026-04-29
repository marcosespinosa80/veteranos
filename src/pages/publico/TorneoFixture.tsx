import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TorneoFixture() {
  const { torneoId } = useParams();
  const [catId, setCatId] = useState<string>("all");

  const { data: cats } = useQuery({
    queryKey: ["pf-cats", torneoId],
    enabled: !!torneoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("torneo_categorias")
        .select("id, categorias(nombre_categoria)")
        .eq("torneo_id", torneoId!);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: equipos } = useQuery({
    queryKey: ["pf-equipos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipos").select("id, nombre_equipo");
      if (error) throw error;
      return new Map((data || []).map((e: any) => [e.id, e.nombre_equipo]));
    },
  });

  const { data: zonas } = useQuery({
    queryKey: ["pf-zonas", torneoId],
    enabled: !!torneoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zonas")
        .select("id, nombre, torneo_categoria_id");
      if (error) throw error;
      return new Map((data || []).map((z: any) => [z.id, z.nombre]));
    },
  });

  const { data: partidos } = useQuery({
    queryKey: ["pf-partidos", torneoId, catId],
    enabled: !!torneoId,
    queryFn: async () => {
      let q = supabase
        .from("partidos")
        .select("id, fecha_numero, dia, hora, estado, equipo_local_id, equipo_visitante_id, equipo_libre_id, goles_local, goles_visitante, zona_id, torneo_categoria_id, cancha_texto")
        .eq("torneo_id", torneoId!)
        .order("fecha_numero", { ascending: true });
      if (catId !== "all") q = q.eq("torneo_categoria_id", catId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Group by fecha_numero
  const grouped = new Map<number, any[]>();
  (partidos || []).forEach((p: any) => {
    const k = p.fecha_numero ?? 0;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(p);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Fixture</h2>
        <Select value={catId} onValueChange={setCatId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {cats?.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.categorias?.nombre_categoria}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {[...grouped.entries()].sort((a, b) => a[0] - b[0]).map(([fecha, lista]) => (
        <Card key={fecha}>
          <CardHeader><CardTitle>Fecha {fecha}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lista.map((p) => {
                const local = equipos?.get(p.equipo_local_id) ?? "—";
                const visit = equipos?.get(p.equipo_visitante_id) ?? "—";
                const libre = p.equipo_libre_id ? equipos?.get(p.equipo_libre_id) : null;
                const zona = p.zona_id ? zonas?.get(p.zona_id) : null;
                if (libre) {
                  return (
                    <div key={p.id} className="flex justify-between items-center border-b pb-2 last:border-0 text-sm">
                      <span className="text-muted-foreground italic">{libre} — LIBRE</span>
                      {zona && <Badge variant="outline">{zona}</Badge>}
                    </div>
                  );
                }
                return (
                  <div key={p.id} className="grid grid-cols-12 items-center gap-2 border-b pb-2 last:border-0 text-sm">
                    <span className="col-span-4 text-right font-medium">{local}</span>
                    <span className="col-span-2 text-center font-bold">
                      {p.goles_local != null ? `${p.goles_local} - ${p.goles_visitante}` : "vs"}
                    </span>
                    <span className="col-span-4 font-medium">{visit}</span>
                    <span className="col-span-2 text-right text-xs text-muted-foreground">
                      {zona && <Badge variant="outline" className="mr-1">{zona}</Badge>}
                      {p.dia ?? ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {(!partidos || partidos.length === 0) && (
        <p className="text-center text-muted-foreground py-8">Fixture aún no generado.</p>
      )}
    </div>
  );
}
