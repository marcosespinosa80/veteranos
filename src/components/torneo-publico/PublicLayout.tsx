import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { Trophy } from "lucide-react";

const tabs = [
  { to: "", label: "Inicio", end: true },
  { to: "fixture", label: "Fixture" },
  { to: "posiciones", label: "Posiciones" },
  { to: "resultados", label: "Resultados" },
  { to: "goleadores", label: "Goleadores" },
];

export default function PublicLayout() {
  const { torneoId } = useParams();
  const base = torneoId ? `/torneo/${torneoId}` : "/torneo";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground border-b border-border">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <Link to="/torneo" className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-accent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Liga de Veteranos de Catamarca</h1>
              <p className="text-xs opacity-80">Portal oficial del torneo</p>
            </div>
          </Link>
          <Link to="/login" className="text-sm underline opacity-80 hover:opacity-100">
            Acceso administrativo
          </Link>
        </div>
        {torneoId && (
          <nav className="container mx-auto px-4">
            <ul className="flex gap-1 overflow-x-auto">
              {tabs.map((t) => (
                <li key={t.to}>
                  <NavLink
                    to={`${base}/${t.to}`.replace(/\/$/, "")}
                    end={t.end}
                    className={({ isActive }) =>
                      `inline-block px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        isActive
                          ? "border-accent text-accent"
                          : "border-transparent hover:border-accent/50"
                      }`
                    }
                  >
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Liga de Veteranos de Fútbol de Catamarca
        </div>
      </footer>
    </div>
  );
}
