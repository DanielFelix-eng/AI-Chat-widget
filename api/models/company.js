import mongoose from 'mongoose'
const companySchema = new mongoose.Schema({
    name: {
        type: string,
        required: true,
        trim: true,

    }, ownerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,


    }, allowedDomains: {
        type: [String],
        default: [],
    },
    widgetConfig: {
        primaryColor: {
            type: String, default: '#4F46E5'
        },
        greeting: {
            type: String, default: 'Hi! how can i help you today'
        }, logoUrl: {
            type: String, default: null
        },
        botName: { type: String, default: 'Support Asistatant' },
        plan: {
            type: String,
            enum: ['free', 'starter', 'pro', 'enterprise'],
            default: 'free'
        },
        usageLimits: {
            maxDocuments: {
                type: Number, default: 20
            },
            maxMessagesPerMonth: {
                type: Number, default: 500
            }
        }
    },
    //Public  Key  sent to the widet  snippet  to identify the company  sort of an  API key 
    widegtPublicKey: {
        type: String,

        required: true,
        unique: true,
        index: true,
    },

},
    { timestamps: true }
)
module.exports = mongoose.model('Company', companySchema)          