export function normalizeKenyanPhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

export function maskKenyanPhone(input) {
  const normalized = normalizeKenyanPhone(input);
  if (!normalized || normalized.length < 6) return '254****';
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}