import Transaction from "../models/transaction.js";
import Subscription from "../models/subscription.js";
import Company from "../models/company.js";
import { PAYSTACK_API_BASE } from "./config.js";

async function verifyPaystackTransaction(reference) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
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
    const message = payload?.message || "Paystack verification failed.";
    throw new Error(message);
  }

  return payload.data;
}

export async function activatePayment(reference, incomingData) {
  const existingTx = await Transaction.findOne({ reference }).lean();
  if (!existingTx) {
    return { alreadyProcessed: true, reason: "missing-transaction" };
  }

  const tx = await Transaction.findOneAndUpdate(
    { reference, status: "pending" },
    { $set: { status: "pending" } },
    { new: true }
  );

  if (!tx) {
    return { alreadyProcessed: true, reason: "already-processed" };
  }

  let verifiedTx;
  try {
    verifiedTx = await verifyPaystackTransaction(reference);
  } catch (error) {
    await Transaction.updateOne(
      { _id: tx._id },
      { status: "failed", failureReason: "verification_failed", gatewayResponse: error.message || "verification_failed" }
    );
    console.error("Paystack verification failed", { reference, message: error.message });
    return { verificationFailed: true };
  }

  const verifiedAmount = Number(verifiedTx.amount || 0) / 100;
  const verifiedCurrency = String(verifiedTx.currency || '').toUpperCase();
  const verifiedReference = String(verifiedTx.reference || '');

  if (verifiedTx.status !== "success" || verifiedAmount !== Number(tx.amount) || verifiedCurrency !== String(tx.currency).toUpperCase() || verifiedReference !== String(tx.reference)) {
    await Transaction.updateOne(
      { _id: tx._id },
      {
        status: "failed",
        failureReason: verifiedTx.status === "failed" ? "payment_failed" : "amount_mismatch",
        gatewayResponse: verifiedTx.gateway_response || String(verifiedTx.status || "mismatch"),
      }
    );
    console.error("Paystack verification mismatch", {
      reference,
      txAmount: tx.amount,
      verifiedAmount,
      txCurrency: tx.currency,
      verifiedCurrency,
      verifiedReference,
      verifiedStatus: verifiedTx.status,
    });
    return { mismatch: true };
  }

  const claimedTx = await Transaction.findOneAndUpdate(
    { _id: tx._id, status: "pending" },
    {
      $set: {
        status: "success",
        paidAt: new Date(),
        paystackTransactionId: verifiedTx.id || incomingData?.id || null,
        processedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!claimedTx) {
    return { alreadyProcessed: true, reason: "already-processed-success" };
  }

  const sub = await Subscription.findOne({ organizationId: claimedTx.organizationId });
  const stillActive = sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date();
  const end = new Date(stillActive ? sub.currentPeriodEnd : Date.now());
  if (claimedTx.interval === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  await Subscription.findOneAndUpdate(
    { organizationId: claimedTx.organizationId },
    {
      planKey: claimedTx.planKey,
      interval: claimedTx.interval,
      status: "active",
      paymentMethod: claimedTx.channel,
      currentPeriodStart: stillActive ? sub.currentPeriodStart : new Date(),
      currentPeriodEnd: end,
      graceEndsAt: null,
      cancelAtPeriodEnd: false,
      remindersSent: { d7: false, d3: false, d1: false },
    },
    { upsert: true, new: true, runValidators: true }
  );

  await Company.updateOne(
    { _id: claimedTx.organizationId },
    { $set: { "widgetConfig.plan": claimedTx.planKey } }
  );

  return { activated: true, reference };
}