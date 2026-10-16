import Subscription from "../models/subscription.js";

export const subscriptionHasAccess = (subscription, now = new Date()) => {
  if (subscription?.status === "active") {
    return Boolean(subscription.currentPeriodEnd && subscription.currentPeriodEnd > now);
  }
  if (subscription?.status === "trialing") {
    return Boolean(subscription.trialEndsAt && subscription.trialEndsAt > now);
  }
  return false;
};

export const requirePlanAccess = async (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      code: "EMAIL_VERIFICATION_REQUIRED",
      message: "Verify your email before using the workspace.",
    });
  }
  if (!req.user.companyId) {
    return res.status(402).json({
      code: "PLAN_REQUIRED",
      message: "Choose a plan to continue.",
    });
  }

  try {
    const subscription = await Subscription.findOne({
      organizationId: req.user.companyId,
    }).select("status trialEndsAt currentPeriodEnd");

    if (!subscriptionHasAccess(subscription)) {
      return res.status(402).json({
        code: "PLAN_REQUIRED",
        message: "Choose a plan to continue.",
      });
    }

    req.subscription = subscription;
    return next();
  } catch (error) {
    console.error("Could not verify workspace subscription:", error);
    return res.status(500).json({
      message: "Could not verify your plan. Please try again.",
    });
  }
};

export const requirePlanAccessOrWorkspaceSetup = async (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      code: "EMAIL_VERIFICATION_REQUIRED",
      message: "Verify your email before setting up your workspace.",
    });
  }
  if (!req.user.companyId) return next();
  return requirePlanAccess(req, res, next);
};
