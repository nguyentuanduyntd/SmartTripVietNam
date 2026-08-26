export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getPasswordChecks(password: string) {
    return {
        length: password.length >= 8,
        letter: /[A-Za-zÀ-ỹ]/.test(password),
        number: /\d/.test(password),
    };
}

export function isValidPassword(password: string): boolean {
    const checks = getPasswordChecks(password);
    return checks.length && checks.letter && checks.number;
}