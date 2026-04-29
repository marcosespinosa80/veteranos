import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import DashboardPage from "./pages/DashboardPage";
import EquiposPage from "./pages/EquiposPage";
import JugadoresPage from "./pages/JugadoresPage";
import ListasBuenaFePage from "./pages/ListasBuenaFePage";
import ListaBuenaFePdf from "./pages/ListaBuenaFePdf";
import PasesPage from "./pages/PasesPage";
import BoletinesPublicPage from "./pages/BoletinesPublicPage";
import BoletinesAdminPage from "./pages/BoletinesAdminPage";
import CarnetsPage from "./pages/CarnetsPage";
import ValidarCarnetPage from "./pages/ValidarCarnetPage";
import UsuariosPage from "./pages/UsuariosPage";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";
import CanchasPage from "./pages/CanchasPage";
import FinanzasPage from "./pages/FinanzasPage";
import MultasPage from "./pages/MultasPage";
import TorneosPage from "./pages/TorneosPage";
import TorneoDetallePage from "./pages/TorneoDetallePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Public */}
            <Route path="/boletines" element={<BoletinesPublicPage />} />

            {/* Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/equipos" element={
              <ProtectedRoute><EquiposPage /></ProtectedRoute>
            } />
            <Route path="/jugadores" element={
              <ProtectedRoute><JugadoresPage /></ProtectedRoute>
            } />
            <Route path="/listas-buena-fe" element={
              <ProtectedRoute><ListasBuenaFePage /></ProtectedRoute>
            } />
            <Route path="/listas-buena-fe/:id/pdf" element={
              <ProtectedRoute><ListaBuenaFePdf /></ProtectedRoute>
            } />
            <Route path="/pases" element={
              <ProtectedRoute><PasesPage /></ProtectedRoute>
            } />
            <Route path="/carnets" element={
              <ProtectedRoute><CarnetsPage /></ProtectedRoute>
            } />
            <Route path="/validar/:token" element={
              <ProtectedRoute><ValidarCarnetPage /></ProtectedRoute>
            } />
            <Route path="/admin/boletines" element={
              <ProtectedRoute><BoletinesAdminPage /></ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute><UsuariosPage /></ProtectedRoute>
            } />

            {/* Placeholder routes */}
            <Route path="/finanzas" element={
              <ProtectedRoute><FinanzasPage /></ProtectedRoute>
            } />
            <Route path="/categorias" element={
              <ProtectedRoute><PlaceholderPage title="Categorías" /></ProtectedRoute>
            } />
            <Route path="/partidos" element={
              <ProtectedRoute><PlaceholderPage title="Partidos" /></ProtectedRoute>
            } />
            <Route path="/fixture" element={
              <ProtectedRoute><PlaceholderPage title="Fixture" /></ProtectedRoute>
            } />
            <Route path="/tabla" element={
              <ProtectedRoute><PlaceholderPage title="Tabla de Posiciones" /></ProtectedRoute>
            } />
            <Route path="/canchas" element={
              <ProtectedRoute><CanchasPage /></ProtectedRoute>
            } />
            <Route path="/tribunal/multas" element={
              <ProtectedRoute><MultasPage /></ProtectedRoute>
            } />
            <Route path="/admin/torneos" element={
              <ProtectedRoute><TorneosPage /></ProtectedRoute>
            } />
            <Route path="/admin/torneos/:id" element={
              <ProtectedRoute><TorneoDetallePage /></ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
