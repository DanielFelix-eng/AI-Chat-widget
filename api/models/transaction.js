import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    provider: { type: String, enum: ["paystack"], default: "paystack" },
    channel: { type: String, enum: ["mpesa", "card"], required: true },

    reference: { type: String, required: true, unique: true },   // your own ref
    paystackTransactionId: { type: Number, default: null },

    amount: { type: Number, required: true },                    // whole KES, not minor units
    currency: { type: String, default: "KES" },

    planKey: { type: String, required: true },
    interval: { type: String, enum: ["monthly", "yearly"], required: true },
    couponCode: { type: String, default: null },
    discountKes: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "success", "failed", "abandoned"],
      default: "pending",
      index: true,
    },
    phoneMasked: { type: String, default: null },                // e.g. +2547****5678
    gatewayResponse: { type: String, default: null },
    failureReason: { type: String, default: null },

    paidAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },                  // set once subscription was extended
  },
  { timestamps: true }
);

transactionSchema.index({ organizationId: 1, createdAt: -1 });   // billing history

/**
 * Atomic claim: only ONE caller (webhook, verify fallback, retry)
 * can move a transaction from pending -> success.
 * Returns the doc if you won the claim, otherwise null (already handled).
 */
transactionSchema.statics.claimSuccess = function (reference, paystackTransactionId) {
  return this.findOneAndUpdate(
    { reference, status: "pending" },
    {
      $set: {
        status: "success",
        paidAt: new Date(),
        paystackTransactionId,
      },
    },
    { new: true }
  );
};

export default mongoose.model("Transaction", transactionSchema);