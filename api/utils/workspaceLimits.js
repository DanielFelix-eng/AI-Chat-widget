import Company from '../models/company.js';
import { DEFAULT_PLAN, getCurrentPeriodStart, getPlanConfig } from '../plans.js';

export function getUsageSnapshot(company) {
  const plan = getPlanConfig(company?.plan || DEFAULT_PLAN);
  const usage = company?.usage || {};
  const repliesUsed = Number(usage.repliesThisPeriod || 0);
  const documentsUsed = Number(usage.documentsCount || 0);
  const widgetsUsed = Number(usage.widgetsCount || 0);

  return {
    plan: company?.plan || DEFAULT_PLAN,
    limit: {
      replies: plan.maxRepliesPerMonth,
      documents: plan.maxDocuments,
      widgets: plan.maxWidgets,
    },
    used: {
      replies: repliesUsed,
      documents: documentsUsed,
      widgets: widgetsUsed,
    },
    remaining: {
      replies: Math.max(0, plan.maxRepliesPerMonth - repliesUsed),
      documents: Math.max(0, plan.maxDocuments - documentsUsed),
      widgets: Math.max(0, plan.maxWidgets - widgetsUsed),
    },
  };
}

export async function ensureCurrentPeriod(company, now = new Date()) {
  const start = getCurrentPeriodStart(now);
  if (!company?.currentPeriodStart || new Date(company.currentPeriodStart).getTime() < start.getTime()) {
    await Company.findOneAndUpdate(
      { _id: company._id },
      {
        $set: {
          currentPeriodStart: start,
          'usage.repliesThisPeriod': 0,
        },
      },
      { new: true }
    );
  }
}

export async function reserveReply(companyId) {
  const company = await Company.findOne({ _id: companyId }).select('_id plan currentPeriodStart usage');
  if (!company) return { allowed: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found.' };

  await ensureCurrentPeriod(company);

  const plan = getPlanConfig(company.plan || DEFAULT_PLAN);
  const currentUsage = Number(company.usage?.repliesThisPeriod || 0);
  if (currentUsage >= plan.maxRepliesPerMonth) {
    return {
      allowed: false,
      code: 'PLAN_LIMIT_REACHED',
      limit: 'repliesThisPeriod',
      plan: company.plan || DEFAULT_PLAN,
      message: plan.openWidgetMessage || 'Our assistant is unavailable right now. Please contact us to upgrade.',
    };
  }

  const updated = await Company.findOneAndUpdate(
    { _id: companyId, 'usage.repliesThisPeriod': { $lt: plan.maxRepliesPerMonth } },
    { $inc: { 'usage.repliesThisPeriod': 1 } },
    { new: true }
  );

  if (!updated) {
    return {
      allowed: false,
      code: 'PLAN_LIMIT_REACHED',
      limit: 'repliesThisPeriod',
      plan: company.plan || DEFAULT_PLAN,
      message: plan.openWidgetMessage || 'Our assistant is unavailable right now. Please contact us to upgrade.',
    };
  }

  return { allowed: true, code: null };
}

export async function releaseReply(companyId) {
  await Company.findOneAndUpdate(
    { _id: companyId, 'usage.repliesThisPeriod': { $gt: 0 } },
    { $inc: { 'usage.repliesThisPeriod': -1 } }
  );
}

export async function ensureDocumentLimit(companyId) {
  const company = await Company.findOne({ _id: companyId }).select('_id plan usage');
  if (!company) {
    return { allowed: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found.' };
  }

  const plan = getPlanConfig(company.plan || DEFAULT_PLAN);
  const current = Number(company.usage?.documentsCount || 0);

  if (current >= plan.maxDocuments) {
    return {
      allowed: false,
      code: 'PLAN_LIMIT_REACHED',
      limit: 'documentsCount',
      plan: company.plan || DEFAULT_PLAN,
      message: 'You have reached your document limit for this plan.',
    };
  }

  return { allowed: true };
}

export async function incrementDocumentCount(companyId, delta = 1) {
  await Company.findOneAndUpdate(
    { _id: companyId },
    { $inc: { 'usage.documentsCount': delta } },
    { new: true }
  );
}

export async function incrementWidgetCount(companyId, delta = 1) {
  await Company.findOneAndUpdate(
    { _id: companyId },
    { $inc: { 'usage.widgetsCount': delta } },
    { new: true }
  );
}
