export function normalizeKenyanPhone(input) {
  const d = String(input).replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(d)) return `+254${d.slice(1)}`;
  if (/^254[17]\d{8}$/.test(d)) return `+${d}`;
  if (/^[17]\d{8}$/.test(d)) return `+254${d}`;
  return null;
}