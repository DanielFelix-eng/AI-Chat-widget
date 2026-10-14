import express from "express";
import { verifyToken } from "../middleware/verify.js";
import Company from "../models/company.js";
import Subscription from "../models/subscription.js";
import Transaction from "../models/transaction.js";
import { normalizeKenyanPhone } from "./normalize.js";

const router = express.Router();
const monthlyPrices = { starter: 300, pro: 600 };

router.post("/free", verifyToken, async (req, res) => {
  const companyId = req.user.companyId;
  if (!companyId) {
    return res.status(403).json({ message: "User is not associated with a company." });
  }

  try {
    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: { "widgetConfig.plan": "free" } },
      { new: true }
    );
    if (!company) return res.status(404).json({ message: "Company workspace not found." });

    await Subscription.findOneAndUpdate(
      { organizationId: companyId },
      {
        $set: {
          planKey: "free",
          interval: "monthly",
          status: "free",
          currentPeriodStart: null,
          currentPeriodEnd: null,
          graceEndsAt: null,
          cancelAtPeriodEnd: false,
          paymentMethod: null,
        },
      },
      { upsert: true, runValidators: true }
    );

    return res.status(200).json({ success: true, plan: "free" });
  } catch (error) {
    console.error("Failed to activate Free plan:", error);
    return res.status(500).json({ message: "Could not activate the Free plan. Please try again." });
  }
});

router.post("/mpesa/charge", verifyToken, async (req, res) => {
  const { planKey, phone } = req.body;
  const companyId = req.user.companyId;
  const amountKes = Object.hasOwn(monthlyPrices, planKey) ? monthlyPrices[planKey] : null;

  if (!companyId) {
    return res.status(403).json({ message: "User is not associated with a company." });
  }
  if (!amountKes) {
    return res.status(400).json({ message: "Choose a valid paid plan." });
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error("PAYSTACK_SECRET_KEY is not configured.");
    return res.status(503).json({ message: "Payments are temporarily unavailable." });
  }

  const msisdn = normalizeKenyanPhone(phone);
  if (!msisdn) return res.status(400).json({ message: "Enter a valid Kenyan phone number." });

  const reference = `sub_${companyId}_${Date.now()}`;

  try {
    await Transaction.create({
      organizationId: companyId,
      userId: req.user._id,
      provider: "paystack",
      channel: "mpesa",
      reference,
      amount: amountKes,
      currency: "KES",
      status: "pending",
      planKey,
      interval: "monthly",
    });

    let response;
    let body;
    try {
      response = await fetch("https://api.paystack.co/charge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: req.user.email,
          amount: amountKes * 100,
          currency: "KES",
          reference,
          mobile_money: { phone: msisdn, provider: "mpesa" },
          metadata: { organizationId: String(companyId), planKey, interval: "monthly" },
        }),
      });
      body = await response.json();
    } catch (error) {
      await Transaction.updateOne(
        { reference },
        { status: "failed", failureReason: "payment_request_failed" }
      );
      console.error("Paystack charge request failed:", error);
      return res.status(502).json({ message: "Could not reach the payment provider. Please try again." });
    }

    if (!response.ok || !body?.status) {
      const gatewayResponse = body?.data?.gateway_response;
      const providerMessage = body?.data?.message || body?.data?.display_text;
      console.error("Paystack rejected M-Pesa charge:", {
        httpStatus: response.status,
        status: body?.status,
        message: body?.message,
        chargeStatus: body?.data?.status,
        gatewayResponse,
        providerMessage,
      });
      await Transaction.updateOne(
        { reference },
        {
          status: "failed",
          failureReason: gatewayResponse || providerMessage || body?.message || "payment_declined",
          gatewayResponse: gatewayResponse || providerMessage || null,
        }
      );
      return res.status(400).json({
        message: providerMessage || gatewayResponse || body?.message || "The payment request was declined.",
      });
    }

    return res.status(200).json({
      reference,
      status: "pending",
      message: body.data?.display_text || "Check your phone and approve the M-Pesa payment request.",
    });
  } catch (error) {
    console.error("Failed to start M-Pesa charge:", error);
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
    }).select("status failureReason planKey");

    if (!transaction) return res.status(404).json({ message: "Payment transaction not found." });
    return res.status(200).json({
      status: transaction.status,
      failureReason: transaction.failureReason,
      planKey: transaction.planKey,
    });
  } catch (error) {
    console.error("Failed to check transaction status:", error);
    return res.status(500).json({ message: "Could not check payment status. Please try again." });
  }
});

export default router;
