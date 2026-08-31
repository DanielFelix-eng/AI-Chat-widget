import { BrevoClient } from '@getbrevo/brevo';

const getClient = () => {
    return new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
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