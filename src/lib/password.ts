export interface PasswordChecks {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export const validatePassword = (password: string): PasswordChecks => ({
  minLength: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

export const isPasswordValid = (password: string): boolean =>
  Object.values(validatePassword(password)).every(Boolean);

export const PASSWORD_RULE_LABELS: { key: keyof PasswordChecks; label: string; error: string }[] = [
  { key: 'minLength', label: 'Mínimo 8 caracteres', error: 'Debe tener al menos 8 caracteres.' },
  { key: 'uppercase', label: 'Una mayúscula', error: 'Debe contener al menos una letra mayúscula.' },
  { key: 'lowercase', label: 'Una minúscula', error: 'Debe contener al menos una letra minúscula.' },
  { key: 'number', label: 'Un número', error: 'Debe contener al menos un número.' },
  { key: 'special', label: 'Un carácter especial', error: 'Debe contener al menos un carácter especial.' },
];

export const passwordErrorMessage = (password: string): string | null => {
  const checks = validatePassword(password);
  const missing = PASSWORD_RULE_LABELS.filter((r) => !checks[r.key]);
  if (missing.length === 0) return null;
  if (missing.length === 1) return missing[0].error;
  return 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.';
};

export const generatePassword = (): string => {
  const mayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minus = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const simbolos = '!@#$%&*?.-_+=';
  const all = mayus + minus + nums + simbolos;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [pick(mayus), pick(minus), pick(nums), pick(simbolos)];
  while (chars.length < 14) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};
