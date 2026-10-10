import { BrevoClient } from '@getbrevo/brevo';

const getClient = () => {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('BREVO_API_KEY is not configured. Set it in the root .env file and restart the API server.');
    }

    return new BrevoClient({ apiKey });
};

export const sendEmail = async ({ to, subject, html }) => {
    const client = getClient();

    await client.transactionalEmails.sendTransacEmail({
        subject,
        htmlContent: html,
        sender: {
            name: process.env.EMAIL_FROM_NAME || 'My App',
            email: process.env.EMAIL_FROM_ADDRESS,
        },
        to: [{ email: to }],
    });
};