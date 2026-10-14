export const plans = [
  { key: "free", name: "Free", monthlyKes: 0, yearlyKes: 0, sortOrder: 0,
    limits: { aiReplies: 100, widgets: 1, documents: 3, seats: 1 } },
  { key: "starter", name: "Starter", monthlyKes: 300, yearlyKes: 3000, sortOrder: 1,
    limits: { aiReplies: 1500, widgets: 1, documents: 25, seats: 2 },
    features: { removeBranding: true } },
  { key: "pro", name: "Pro", monthlyKes: 600, yearlyKes: 6000, sortOrder: 2,
    limits: { aiReplies: 6000, widgets: 3, documents: 100, seats: 5 },
    features: { removeBranding: true, analytics: true, liveHandoff: true } },
  { key: "business", name: "Business", monthlyKes: 16500, yearlyKes: 165000, sortOrder: 3,
    limits: { aiReplies: 25000, widgets: 10, documents: 500, seats: 15 },
    features: { removeBranding: true, analytics: true, liveHandoff: true, apiAccess: true, prioritySupport: true } },
];