export type PhoneValidation = { normalized: string | null; valid: boolean; reason?: string };

export function normalizeBrazilianPhone(input: unknown, countryCode = '55'): PhoneValidation {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return { normalized: null, valid: false, reason: 'Telefone ausente' };
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith(countryCode)) digits = digits.slice(countryCode.length);
  if (digits.length === 10 || digits.length === 11) {
    const ddd = Number(digits.slice(0, 2));
    const local = digits.slice(2);
    if (ddd < 11 || ddd > 99 || /^0/.test(local)) return { normalized: null, valid: false, reason: 'DDD ou número inválido' };
    return { normalized: `${countryCode}${digits}`, valid: true };
  }
  return { normalized: null, valid: false, reason: 'Telefone deve possuir DDD e 8 ou 9 dígitos' };
}

export function formatBrazilianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^55/, '');
  return digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}
