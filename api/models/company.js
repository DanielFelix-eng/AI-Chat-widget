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
        allowedDomains: {
            type: [String],
            default: [],
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
            plan: {
                type: String,
                enum: ['free', 'starter', 'pro', 'enterprise'],
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