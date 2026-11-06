import mongoose from 'mongoose';

const domainClaimSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    normalizedDomain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      index: true,
    },
    verificationToken: {
      type: String,
      required: true,
      trim: true,
    },
    verificationMethod: {
      type: String,
      enum: ['dns', 'meta', 'file', null],
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

domainClaimSchema.index({ normalizedDomain: 1 }, { unique: true });
domainClaimSchema.index({ verificationStatus: 1, expiresAt: 1 });

export default mongoose.model('DomainClaim', domainClaimSchema);
