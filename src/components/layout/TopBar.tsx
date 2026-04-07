import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopMenu } from './TopMenu';

interface TopBarProps {
  title: string;
  onMenuToggle?: () => void;
}

export function TopBar({ title, onMenuToggle }: TopBarProps) {
  return (
    <header className="border-b border-border bg-card shrink-0">
      <div className="h-14 flex items-center px-4 gap-3">
        {onMenuToggle && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-lg font-display font-bold text-foreground truncate">{title}</h1>
      </div>
      <div className="hidden md:flex items-center px-4 pb-2">
        <TopMenu />
      </div>
    </header>
  );
}
