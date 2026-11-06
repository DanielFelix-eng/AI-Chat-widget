export const PAYSTACK_API_BASE = (process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co').replace(/\/$/, '');

export const PAYSTACK_PLAN_CONFIG = Object.freeze({
  starter: {
    key: 'starter',
    amount: Number(process.env.PLAN_STARTER_AMOUNT || 300),
    currency: (process.env.PLAN_STARTER_CURRENCY || 'KES').toUpperCase(),
    interval: 'monthly',
  },
  pro: {
    key: 'pro',
    amount: Number(process.env.PLAN_PRO_AMOUNT || 600),
    currency: (process.env.PLAN_PRO_CURRENCY || 'KES').toUpperCase(),
    interval: 'monthly',
  },
});

export function getPlanConfig(planKey) {
  const normalizedPlan = String(planKey || '').trim();
  if (!normalizedPlan || !PAYSTACK_PLAN_CONFIG[normalizedPlan]) {
    return null;
  }
  return PAYSTACK_PLAN_CONFIG[normalizedPlan];
}
