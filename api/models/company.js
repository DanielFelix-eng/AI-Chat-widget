import mongoose from 'mongoose'

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        website: {
            type: String,
            default: null,
        },
        ownerUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        onboardingCompleted: {
            type: Boolean,
            default: false,
        },
        allowedDomains: {
            type: [String],
            default: [],
        },
        plan: {
            type: String,
            enum: ['free', 'pro', 'business'],
            default: 'free',
            index: true,
        },
        planStatus: {
            type: String,
            enum: ['active', 'grace', 'paused', 'expired'],
            default: 'active',
            index: true,
        },
        currentPeriodStart: {
            type: Date,
            default: null,
        },
        usage: {
            repliesThisPeriod: {
                type: Number,
                default: 0,
            },
            documentsCount: {
                type: Number,
                default: 0,
            },
            widgetsCount: {
                type: Number,
                default: 0,
            },
        },
        usageWarningsSent: {
            replies80: { type: Boolean, default: false },
            replies100: { type: Boolean, default: false },
        },
        widgetConfig: {
            primaryColor: {
                type: String,
                default: '#65D0F4',
            },
            greeting: {
                type: String,
                default: 'Hi! How can I help you today?',
            },
            position: {
                type: String,
                enum: ['bottom-right', 'bottom-left'],
                default: 'bottom-right',
            },
            enabled: {
                type: Boolean,
                default: true,
            },
            logoUrl: {
                type: String,
                default: null,
            },
            botName: {
                type: String,
                default: 'Support assistant',
            },
            limitMessage: {
                type: String,
                default: 'Our assistant is unavailable right now. Please contact us to upgrade.',
            },
            branding: {
                type: String,
                default: 'Powered by Nudge',
            },
            plan: {
                type: String,
                enum: ['free', 'pro', 'business'],
                default: 'free',
            },
            usageLimits: {
                maxDocuments: {
                    type: Number,
                    default: 20,
                },
                maxMessagesPerMonth: {
                    type: Number,
                    default: 500,
                },
            },
        },
        widgetPublicKey: {
            type: String,
            required: true,
            unique: true,
        },
    },
    { timestamps: true }
)

export default mongoose.model('Company', companySchema)