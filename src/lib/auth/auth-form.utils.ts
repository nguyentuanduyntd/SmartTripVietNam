export type PasswordChecks = {
  length: boolean;
  letter: boolean;
  number: boolean;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    letter: /[A-Za-zÀ-ỹ]/.test(password),
    number: /\d/.test(password),
  };
}

export function isPasswordValid(checks: PasswordChecks) {
  return checks.length && checks.letter && checks.number;
}
