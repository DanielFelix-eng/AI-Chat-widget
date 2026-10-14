import Transaction from "../models/transaction.js";
import Subscription from "../models/subscription.js";
import Company from "../models/company.js";

export async function activatePayment(reference, paystackData) {
  const tx = await Transaction.claimSuccess(reference, paystackData.id);
  if (!tx) return { alreadyProcessed: true };

  // 2. Safety checks (amount comes back in minor units)
  const paidKes = paystackData.amount / 100;
  if (paidKes !== tx.amount || paystackData.currency !== tx.currency) {
    await Transaction.updateOne(
      { _id: tx._id },
      { status: "failed", failureReason: "amount_mismatch" }
    );
    console.error("Amount mismatch", reference, paidKes, tx.amount);
    return { mismatch: true };
  }

  // 3. Extend the subscription
  const sub = await Subscription.findOne({ organizationId: tx.organizationId });
  const stillActive = sub?.currentPeriodEnd && sub.currentPeriodEnd > new Date();
  const end = new Date(stillActive ? sub.currentPeriodEnd : Date.now());
  tx.interval === "yearly"
    ? end.setFullYear(end.getFullYear() + 1)
    : end.setMonth(end.getMonth() + 1);

  await Subscription.findOneAndUpdate(
    { organizationId: tx.organizationId },
    {
      planKey: tx.planKey,
      interval: tx.interval,
      status: "active",
      paymentMethod: tx.channel,
      currentPeriodStart: stillActive ? sub.currentPeriodStart : new Date(),
      currentPeriodEnd: end,
      graceEndsAt: null,
      cancelAtPeriodEnd: false,
      remindersSent: { d7: false, d3: false, d1: false },
    },
    { upsert: true, new: true, runValidators: true }
  );

  await Company.updateOne(
    { _id: tx.organizationId },
    { $set: { "widgetConfig.plan": tx.planKey } }
  );
  await Transaction.updateOne({ _id: tx._id }, { processedAt: new Date() });


  return { activated: true };
}