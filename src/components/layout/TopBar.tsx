import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  title: string;
  onMenuToggle?: () => void;
}

export function TopBar({ title, onMenuToggle }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
      {onMenuToggle && (
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
          <Menu className="w-5 h-5" />
        </Button>
      )}
      <h1 className="text-lg font-display font-bold text-foreground truncate">{title}</h1>
    </header>
  );
}
