import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true }, // free | starter | pro | business
    name: { type: String, required: true },
    monthlyKes: { type: Number, required: true, min: 0 },
    yearlyKes: { type: Number, required: true, min: 0 },
    limits: {
      aiReplies: { type: Number, required: true },   // per billing period
      widgets: { type: Number, required: true },
      documents: { type: Number, required: true },
      seats: { type: Number, required: true },
    },
    features: {
      removeBranding: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      liveHandoff: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },
    // only needed for card auto-renew via Paystack Plans
    paystackPlanCodes: {
      monthly: { type: String, default: null },
      yearly: { type: String, default: null },
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);