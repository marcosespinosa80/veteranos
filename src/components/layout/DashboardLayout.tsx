import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import type { UserRole } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  userRole: UserRole;
  userName: string;
  pageTitle: string;
  onLogout: () => void;
  children?: React.ReactNode;
}

export function DashboardLayout({ userRole, userName, pageTitle, onLogout, children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed md:relative z-50 md:z-auto transition-transform duration-300 md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <AppSidebar
          userRole={userRole}
          userName={userName}
          onLogout={onLogout}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={pageTitle}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
