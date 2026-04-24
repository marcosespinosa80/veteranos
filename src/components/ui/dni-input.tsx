import * as React from 'react';
import { Input } from '@/components/ui/input';
import { formatDni } from '@/lib/dni';

type InputProps = React.ComponentPropsWithoutRef<typeof Input>;

export interface DniInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: string;
  /** Recibe el valor ya formateado con puntos */
  onChange: (formatted: string) => void;
}

/**
 * Input reutilizable para DNI argentino.
 * - Formatea automáticamente con puntos mientras el usuario escribe.
 * - Limita a 8 dígitos (10 caracteres con puntos).
 * - Acepta entradas con o sin puntos.
 */
export const DniInput = React.forwardRef<HTMLInputElement, DniInputProps>(
  ({ value, onChange, placeholder, inputMode, maxLength, ...rest }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode={inputMode ?? 'numeric'}
        maxLength={maxLength ?? 10}
        placeholder={placeholder ?? '28.404.402'}
        value={value ?? ''}
        onChange={(e) => onChange(formatDni(e.target.value))}
        {...rest}
      />
    );
  }
);
DniInput.displayName = 'DniInput';
