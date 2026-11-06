export const PLAN_CONFIG = Object.freeze({
  free: {
    key: 'free',
    label: 'Free',
    maxWidgets: 1,
    maxDocuments: 2,
    maxRepliesPerMonth: 50,
    maxDocumentSizeMB: 5,
    maxPagesPerDocument: 20,
    branding: 'Powered by Nudge',
    apiAccess: false,
    teamMembers: 0,
    openWidgetMessage: 'Our assistant is unavailable right now. Please contact us to upgrade.',
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    maxWidgets: 5,
    maxDocuments: 25,
    maxRepliesPerMonth: 2500,
    maxDocumentSizeMB: 15,
    maxPagesPerDocument: 60,
    branding: false,
    apiAccess: true,
    teamMembers: 5,
    openWidgetMessage: 'Our assistant is temporarily unavailable. Please upgrade to continue.',
  },
  business: {
    key: 'business',
    label: 'Business',
    maxWidgets: 20,
    maxDocuments: 200,
    maxRepliesPerMonth: 20000,
    maxDocumentSizeMB: 25,
    maxPagesPerDocument: 100,
    branding: false,
    apiAccess: true,
    teamMembers: 25,
    openWidgetMessage: 'Our assistant is currently unavailable. Please contact support to continue.',
  },
});

export const DEFAULT_PLAN = 'free';
export const PLAN_ORDER = ['free', 'pro', 'business'];

export function normalizePlanKey(planKey) {
  const key = String(planKey || DEFAULT_PLAN).trim().toLowerCase();
  return PLAN_ORDER.includes(key) ? key : DEFAULT_PLAN;
}

export function getPlanConfig(planKey) {
  return PLAN_CONFIG[normalizePlanKey(planKey)] || PLAN_CONFIG[DEFAULT_PLAN];
}

export function getPlanLimit(planKey, limitKey) {
  const plan = getPlanConfig(planKey);
  return plan?.[limitKey] ?? PLAN_CONFIG[DEFAULT_PLAN][limitKey];
}

export function getCurrentPeriodStart(now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
