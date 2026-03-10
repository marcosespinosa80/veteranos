import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, ClipboardList, ArrowRightLeft } from 'lucide-react';

const stats = [
  { label: 'Jugadores', value: '—', icon: Users },
  { label: 'Equipos', value: '—', icon: Shield },
  { label: 'Listas pendientes', value: '—', icon: ClipboardList },
  { label: 'Pases pendientes', value: '—', icon: ArrowRightLeft },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bienvenido al sistema de gestión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Desde aquí podés administrar jugadores, equipos, listas de buena fe, pases y carnets de la Liga de Veteranos de Fútbol de Catamarca.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
