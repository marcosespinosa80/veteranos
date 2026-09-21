import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePassword, PASSWORD_RULE_LABELS } from '@/lib/password';

interface Props {
  password: string;
  className?: string;
}

export function PasswordRequirements({ password, className }: Props) {
  const checks = validatePassword(password);
  return (
    <ul className={cn('space-y-0.5 text-xs', className)}>
      <li className="text-muted-foreground mb-1">La contraseña debe contener:</li>
      {PASSWORD_RULE_LABELS.map((r) => {
        const ok = checks[r.key];
        return (
          <li key={r.key} className={cn('flex items-center gap-1', ok ? 'text-primary' : 'text-muted-foreground')}>
            {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>{r.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
