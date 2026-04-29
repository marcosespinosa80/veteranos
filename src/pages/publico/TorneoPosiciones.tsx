import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calcularTabla } from "@/lib/posiciones";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TorneoPosiciones() {
  const { torneoId } = useParams();
  const [catId, setCatId] = useState<string>("");

  const { data: cats } = useQuery({
    queryKey: ["pp-cats", torneoId],
    enabled: !!torneoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("torneo_categorias")
        .select("id, categorias(nombre_categoria)")
        .eq("torneo_id", torneoId!);
      if (error) throw error;
      const arr = data || [];
      if (arr.length && !catId) setCatId(arr[0].id);
      return arr;
    },
  });

  const { data: zonas } = useQuery({
    queryKey: ["pp-zonas", catId],
    enabled: !!catId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zonas")
        .select("id, nombre")
        .eq("torneo_categoria_id", catId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: equipos } = useQuery({
    queryKey: ["pp-equipos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipos").select("id, nombre_equipo");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: partidos } = useQuery({
    queryKey: ["pp-partidos", catId],
    enabled: !!catId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partidos")
        .select("id, zona_id, estado, equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, ganador_id, hubo_penales")
        .eq("torneo_categoria_id", catId);
      if (error) throw error;
      return data || [];
    },
  });

  const renderTabla = (filtro: (p: any) => boolean) => {
    const tabla = calcularTabla(equipos || [], (partidos || []).filter(filtro) as any);
    return (
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Equipo</th>
            <th className="px-2 py-2">PJ</th>
            <th className="px-2 py-2">PG</th>
            <th className="px-2 py-2">PP</th>
            <th className="px-2 py-2">GF</th>
            <th className="px-2 py-2">GC</th>
            <th className="px-2 py-2">DG</th>
            <th className="px-2 py-2 font-bold">PTS</th>
          </tr>
        </thead>
        <tbody>
          {tabla.filter(f => f.pj > 0 || (equipos || []).find(e => e.id === f.equipo_id)).map((f, i) => (
            <tr key={f.equipo_id} className="border-b">
              <td className="px-2 py-2">{i + 1}</td>
              <td className="px-2 py-2 font-medium">{f.equipo}</td>
              <td className="px-2 py-2 text-center">{f.pj}</td>
              <td className="px-2 py-2 text-center">{f.pg}</td>
              <td className="px-2 py-2 text-center">{f.pp}</td>
              <td className="px-2 py-2 text-center">{f.gf}</td>
              <td className="px-2 py-2 text-center">{f.gc}</td>
              <td className="px-2 py-2 text-center">{f.dg}</td>
              <td className="px-2 py-2 text-center font-bold">{f.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Posiciones</h2>
        <Select value={catId} onValueChange={setCatId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            {cats?.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.categorias?.nombre_categoria}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {zonas?.map((z) => (
        <Card key={z.id}>
          <CardHeader><CardTitle>{z.nombre}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {renderTabla((p) => p.zona_id === z.id)}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>Tabla General</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {renderTabla(() => true)}
        </CardContent>
      </Card>
    </div>
  );
}
