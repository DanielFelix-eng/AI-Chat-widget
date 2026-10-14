import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },
    planKey: { type: String, required: true, default: "free" },
    interval: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "canceled", "free"],
      default: "free",
      index: true,
    },

    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null, index: true },
    trialEndsAt: { type: Date, default: null },
    graceEndsAt: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // how this org pays: drives auto-renew vs reminder flow
    paymentMethod: { type: String, enum: ["mpesa", "card", null], default: null },

    paystack: {
      customerCode: { type: String, default: null },
      subscriptionCode: { type: String, default: null },
      emailToken: { type: String, default: null },       // needed to cancel a card subscription
      authorizationCode: { type: String, default: null },
    },

    lastMpesaPhone: { type: String, default: null },      // to pre-fill "Renew now"

    // reminder tracking so the cron never double-sends
    remindersSent: {
      d7: { type: Boolean, default: false },
      d3: { type: Boolean, default: false },
      d1: { type: Boolean, default: false },
    },

    appliedCouponCode: { type: String, default: null },
  },
  { timestamps: true }
);

subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 }); // renewal cron query

export default mongoose.model("Subscription", subscriptionSchema);