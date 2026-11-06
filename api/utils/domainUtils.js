import psl from 'psl';

const SHARED_PLATFORM_SUFFIXES = [
  'github.io',
  'vercel.app',
  'netlify.app',
  'onrender.com',
  'wixsite.com',
  'myshopify.com',
  'pages.dev',
  'glitch.me',
  'fly.dev',
  'surge.sh',
  'replit.dev',
  'app.github.dev',
  'webflow.io',
];

export function normalizeDomainInput(value) {
  if (typeof value !== 'string') return null;

  let host = value.trim().toLowerCase();
  if (!host) return null;

  try {
    const parsed = new URL(host.includes('://') ? host : `https://${host}`);
    host = parsed.hostname.toLowerCase();
  } catch {
    host = host
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/.*$/, '')
      .split('?')[0]
      .split('#')[0]
      .replace(/:.*$/, '');
  }

  host = host.replace(/^\./, '').replace(/\.$/, '').trim();
  if (!host || host === 'localhost' || host.includes('/') || host.includes(' ')) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  const withoutWww = host.replace(/^www\./i, '');
  if (!withoutWww || withoutWww.includes('/')) return null;

  const isPlatformHost = SHARED_PLATFORM_SUFFIXES.some((suffix) =>
    withoutWww === suffix || withoutWww.endsWith(`.${suffix}`)
  );

  if (isPlatformHost) {
    return withoutWww;
  }

  const parsed = psl.parse(withoutWww);
  return parsed && parsed.domain ? parsed.domain.toLowerCase() : withoutWww;
}

export function makeDomainVerificationToken() {
  return `nudge-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDomainVerificationText(token) {
  return `nudge-domain-verification=${token}`;
}
