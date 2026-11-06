import crypto from "node:crypto";
import express from "express";
import { verifyToken } from "../middleware/verify.js";
import Company from "../models/company.js";
import Subscription from "../models/subscription.js";
import Transaction from "../models/transaction.js";
import { PAYSTACK_API_BASE, getPlanConfig } from "./config.js";
import { activatePayment } from "./activatePayment.js";
import { maskKenyanPhone, normalizeKenyanPhone } from "./normalize.js";

const router = express.Router();
const MAX_CHARGE_REQUESTS_PER_MINUTE = 5;
const MAX_CHARGE_REQUESTS_PER_IP_PER_MINUTE = 10;
const MAX_PENDING_ATTEMPTS_PER_USER = 3;
const PENDING_PAYMENT_TIMEOUT_MS = 5 * 60 * 1000;
const userChargeAttempts = new Map();
const ipChargeAttempts = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function pruneTimestamps(timestamps, windowMs) {
  const now = Date.now();
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

function applyRateLimit(req, res, next) {
  const userKey = String(req.user?._id || "anonymous");
  const ipKey = getClientIp(req);
  const now = Date.now();
  const userTimestamps = pruneTimestamps(userChargeAttempts.get(userKey) || [], 60_000);
  const ipTimestamps = pruneTimestamps(ipChargeAttempts.get(ipKey) || [], 60_000);

  if (userTimestamps.length >= MAX_CHARGE_REQUESTS_PER_MINUTE || ipTimestamps.length >= MAX_CHARGE_REQUESTS_PER_IP_PER_MINUTE) {
    return res.status(429).json({ message: "Too many payment attempts. Please try again in a minute." });
  }

  userChargeAttempts.set(userKey, [...userTimestamps, now]);
  ipChargeAttempts.set(ipKey, [...ipTimestamps, now]);
  next();
}

async function checkUserPendingLimit(req, res, next) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pendingCount = await Transaction.countDocuments({
    userId: req.user._id,
    status: "pending",
    createdAt: { $gte: cutoff },
  });

  if (pendingCount >= MAX_PENDING_ATTEMPTS_PER_USER) {
    return res.status(409).json({ message: "You already have too many pending payments. Please complete or cancel one before trying again." });
  }

  next();
}

async function verifyPaystackTransaction(reference) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("Paystack is not configured.");
  }

  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status || !payload?.data) {
    throw new Error(payload?.message || "Paystack verification failed.");
  }

  return payload.data;
}

async function reconcilePendingPayment(transaction) {
  if (transaction.status !== "pending") {
    return transaction;
  }

  const pendingAgeMs = Date.now() - new Date(transaction.createdAt).getTime();
  if (pendingAgeMs < PENDING_PAYMENT_TIMEOUT_MS) {
    return transaction;
  }

  try {
    const verified = await verifyPaystackTransaction(transaction.reference);

    if (verified.status === "success") {
      await activatePayment(transaction.reference, verified);
      return Transaction.findById(transaction._id).lean();
    }

    const updated = await Transaction.findOneAndUpdate(
      { _id: transaction._id, status: "pending" },
      {
        $set: {
          status: verified.status === "failed" ? "failed" : "abandoned",
          failureReason: verified.gateway_response || verified.status || "payment_timed_out",
          gatewayResponse: verified.gateway_response || String(verified.status || "payment_timed_out"),
        },
      },
      { new: true }
    );

    return updated || { status: verified.status === "failed" ? "failed" : "abandoned" };
  } catch (error) {
    console.error("Pending transaction reconciliation failed", { reference: transaction.reference, message: error.message });
    return transaction;
  }
}

export async function verifyStalePendingPayments() {
  const staleCutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MS);
  const staleTransactions = await Transaction.find({
    status: "pending",
    createdAt: { $lt: staleCutoff },
  }).limit(50);

  for (const transaction of staleTransactions) {
    await reconcilePendingPayment(transaction);
  }

  return staleTransactions.length;
}

setInterval(() => {
  verifyStalePendingPayments().catch((error) => {
    console.error("Stale payment reconciliation failed", { message: error.message });
  });
}, PENDING_PAYMENT_TIMEOUT_MS);

async function startTrial(req, res) {
  const companyId = req.user.companyId;
  const planKey = req.body?.planKey || "starter";
  const planConfig = getPlanConfig(planKey);

  if (!companyId) {
    return res.status(403).json({ message: "User is not associated with a company." });
  }
  if (!req.user.isVerified) {
    return res.status(403).json({ message: "Verify your email before selecting a plan." });
  }
  if (!planConfig) {
    return res.status(400).json({ message: "Choose a valid plan." });
  }

  try {
    const company = await Company.findById(companyId).select("_id");
    if (!company) return res.status(404).json({ message: "Company workspace not found." });

    const existing = await Subscription.findOne({ organizationId: companyId });
    if (existing?.trialEndsAt || ["active", "trialing"].includes(existing?.status)) {
      return res.status(409).json({ message: "Your free month has already been used." });
    }

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
    const subscription = await Subscription.findOneAndUpdate(
      {
        organizationId: companyId,
        $and: [
          { $or: [{ trialEndsAt: null }, { trialEndsAt: { $exists: false } }] },
          { status: { $nin: ["active", "trialing"] } },
        ],
      },
      {
        $set: {
          planKey,
          interval: planConfig.interval,
          status: "trialing",
          currentPeriodStart: now,
          currentPeriodEnd: null,
          trialEndsAt,
          graceEndsAt: null,
          cancelAtPeriodEnd: false,
          paymentMethod: null,
        },
      },
      { upsert: !existing, new: true, runValidators: true }
    );

    if (!subscription) {
      return res.status(409).json({ message: "Your free month has already been used." });
    }

    await Company.findByIdAndUpdate(
      companyId,
      { $set: { "widgetConfig.plan": planKey } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      plan: planKey,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Your free month has already been used." });
    }
    console.error("Failed to activate plan trial", { message: error.message });
    return res.status(500).json({ message: "Could not start your free month. Please try again." });
  }
}

router.get("/subscription", verifyToken, async (req, res) => {
  if (!req.user.companyId) {
    return res.status(200).json({ subscription: null, hasAccess: false, trialUsed: false });
  }

  try {
    const subscription = await Subscription.findOne({ organizationId: req.user.companyId }).select("status planKey trialEndsAt currentPeriodEnd");

    return res.status(200).json({
      subscription: subscription ? {
        status: subscription.status,
        planKey: subscription.planKey,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
      } : null,
      hasAccess: subscription?.status === "trialing"
        ? Boolean(subscription.trialEndsAt && subscription.trialEndsAt > new Date())
        : Boolean(subscription?.status === "active" && subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date()),
      trialUsed: Boolean(subscription?.trialEndsAt),
    });
  } catch (error) {
    console.error("Failed to load subscription", { message: error.message });
    return res.status(500).json({ message: "Could not load your plan. Please try again." });
  }
});

router.post("/trial", verifyToken, startTrial);
router.post("/free", verifyToken, startTrial);

router.post("/mpesa/charge", verifyToken, applyRateLimit, checkUserPendingLimit, async (req, res) => {
  const rawPlanKey = (req.body?.planKey || req.body?.plan || '').toString().trim().toLowerCase();
  const rawPhone = (req.body?.phone || req.body?.phoneNumber || req.body?.mobile || '').toString().trim();
  const companyId = req.user.companyId;
  const planConfig = getPlanConfig(rawPlanKey);

  if (!companyId) {
    return res.status(403).json({ message: "User is not associated with a company." });
  }
  if (!req.user.isVerified) {
    return res.status(403).json({ message: "Verify your email before making a payment." });
  }
  if (!planConfig) {
    return res.status(400).json({ message: "Choose a valid paid plan." });
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error("PAYSTACK_SECRET_KEY is not configured.");
    return res.status(503).json({ message: "Payments are temporarily unavailable." });
  }

  const normalizedPhone = normalizeKenyanPhone(rawPhone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: "Enter a valid Kenyan phone number in the format 254XXXXXXXXX." });
  }

  const reference = `sub_${companyId}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

  try {
    const payment = await Transaction.create({
      organizationId: companyId,
      userId: req.user._id,
      provider: "paystack",
      channel: "mpesa",
      reference,
      amount: planConfig.amount,
      currency: planConfig.currency,
      status: "pending",
      planKey: rawPlanKey,
      interval: planConfig.interval,
      phoneMasked: maskKenyanPhone(normalizedPhone),
    });

    let response;
    let body;
    try {
      response = await fetch(`${PAYSTACK_API_BASE}/charge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: req.user.email,
          amount: planConfig.amount * 100,
          currency: planConfig.currency,
          reference,
          mobile_money: { phone: normalizedPhone, provider: "mpesa" },
          metadata: { organizationId: String(companyId), planKey: rawPlanKey, interval: planConfig.interval },
        }),
      });
      body = await response.json();
    } catch (error) {
      await Transaction.updateOne(
        { _id: payment._id, status: "pending" },
        { status: "failed", failureReason: "payment_request_failed", gatewayResponse: "payment_request_failed" }
      );
      console.error("Paystack charge request failed", { reference, message: error.message });
      return res.status(502).json({ message: "Could not reach the payment provider. Please try again." });
    }

    if (!response.ok || !body?.status) {
      const gatewayResponse = body?.data?.gateway_response;
      const providerMessage = body?.data?.message || body?.data?.display_text;
      const userMessage = providerMessage || gatewayResponse || body?.message || "The payment request was declined.";

      await Transaction.updateOne(
        { _id: payment._id, status: "pending" },
        {
          status: "failed",
          failureReason: gatewayResponse || providerMessage || body?.message || "payment_declined",
          gatewayResponse: gatewayResponse || providerMessage || null,
        }
      );

      console.error("Paystack rejected M-Pesa charge", {
        reference,
        httpStatus: response.status,
        status: body?.status,
        message: body?.message,
      });

      return res.status(400).json({ message: userMessage });
    }

    return res.status(200).json({
      reference,
      status: "pending",
      message: body.data?.display_text || "Check your phone and approve the M-Pesa payment request.",
    });
  } catch (error) {
    console.error("Failed to start M-Pesa charge", { message: error.message });
    return res.status(500).json({ message: "Could not start your payment. Please try again." });
  }
});

router.get("/transactions/:reference", verifyToken, async (req, res) => {
  const companyId = req.user.companyId;
  if (!companyId) {
    return res.status(403).json({ message: "User is not associated with a company." });
  }

  try {
    const transaction = await Transaction.findOne({
      reference: req.params.reference,
      organizationId: companyId,
      userId: req.user._id,
    }).select("status failureReason planKey createdAt amount currency");

    if (!transaction) return res.status(404).json({ message: "Payment transaction not found." });

    if (transaction.status === "pending") {
      const refreshed = await reconcilePendingPayment(transaction);
      const latest = refreshed && refreshed._id ? refreshed : await Transaction.findById(transaction._id).lean();
      if (latest && latest.status && latest.status !== "pending") {
        return res.status(200).json({
          status: latest.status,
          failureReason: latest.failureReason || null,
          planKey: latest.planKey || transaction.planKey,
          reference: latest.reference || transaction.reference,
          amount: latest.amount || transaction.amount,
          currency: latest.currency || transaction.currency,
        });
      }
    }

    const currentStatus = await Transaction.findById(transaction._id).lean();
    return res.status(200).json({
      status: currentStatus?.status || transaction.status,
      failureReason: currentStatus?.failureReason || transaction.failureReason,
      planKey: currentStatus?.planKey || transaction.planKey,
      reference: currentStatus?.reference || transaction.reference,
      amount: currentStatus?.amount || transaction.amount,
      currency: currentStatus?.currency || transaction.currency,
    });
  } catch (error) {
    console.error("Failed to check transaction status", { message: error.message });
    return res.status(500).json({ message: "Could not check payment status. Please try again." });
  }
});

export default router;
