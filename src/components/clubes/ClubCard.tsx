import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, MapPin, Users, Pencil, Eye, Power } from 'lucide-react';

interface ClubCardProps {
  equipo: any;
  categorias: { id: string; nombre_categoria: string }[];
  jugadorCount: number;
  isAdmin: boolean;
  onEdit: () => void;
  onViewPlantel: () => void;
  onToggleEstado?: () => void;
}

export function ClubCard({ equipo, categorias, jugadorCount, isAdmin, onEdit, onViewPlantel, onToggleEstado }: ClubCardProps) {
  const delegadoCount = (equipo.delegado_1 ? 1 : 0) + (equipo.delegado_2 ? 1 : 0);

  return (
    <Card className={`flex flex-col ${equipo.estado === 'inactivo' ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <h3 className="font-semibold text-base truncate">{equipo.nombre_equipo}</h3>
          </div>
          <Badge
            variant={equipo.estado === 'activo' ? 'default' : 'secondary'}
            className={equipo.estado === 'activo' ? 'bg-primary/15 text-primary border-primary/30 shrink-0' : 'shrink-0'}
          >
            {equipo.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
        {equipo.cancha && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{equipo.cancha}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        {/* Categorías */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">CATEGORÍAS PARTICIPANTES</p>
          <div className="flex flex-wrap gap-1">
            {categorias.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Sin categorías</span>
            ) : (
              categorias.map((c) => (
                <Badge key={c.id} variant="outline" className="text-[10px] px-1.5 py-0">
                  {c.nombre_categoria}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{jugadorCount}</span>
            <span className="text-muted-foreground text-xs">jugadores</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Delegados: {delegadoCount}/2
          </div>
        </div>

        {/* Delegados names */}
        {(equipo.delegado1 || equipo.delegado2) && (
          <div className="text-xs space-y-0.5">
            {equipo.delegado1 && (
              <p><span className="text-muted-foreground">Titular:</span> {equipo.delegado1.apellido}, {equipo.delegado1.nombre}</p>
            )}
            {equipo.delegado2 && (
              <p><span className="text-muted-foreground">Suplente:</span> {equipo.delegado2.apellido}, {equipo.delegado2.nombre}</p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium tracking-wide">TEMPORADA 2026</span>
        <div className="flex gap-1">
          {isAdmin && onToggleEstado && (
            <Button size="sm" variant="ghost" onClick={onToggleEstado} title={equipo.estado === 'activo' ? 'Desactivar' : 'Activar'}>
              <Power className={`w-3.5 h-3.5 mr-1 ${equipo.estado === 'activo' ? 'text-destructive' : 'text-primary'}`} />
              {equipo.estado === 'activo' ? 'Desactivar' : 'Activar'}
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onViewPlantel}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Ver Plantel
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
