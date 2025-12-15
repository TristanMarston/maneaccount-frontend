import { Resend } from 'resend';
import { ManeAccountEmail } from '@/app/emails/EmailTemplate';
import { render } from '@react-email/render';
import ManeAccountCodeEmail from '@/app/emails/EmailCodeTemplate';

// Ensure you set RESEND_API_KEY in your .env file
const resend = new Resend(process.env.RESEND_API_KEY);

type EmailPayload = {
    to: string;
    subject: string;
    heading: string;
    message: React.ReactNode; // Can be string or JSX components
    actionLabel?: string;
    actionUrl?: string;
};

export async function sendNotificationEmail({ to, subject, heading, message, actionLabel, actionUrl }: EmailPayload) {
    if (!to) return;

    try {
        const emailHtml = await render(
            ManeAccountEmail({
                previewText: subject,
                heading,
                message,
                actionLabel,
                actionUrl,
            })
        );

        const { data, error } = await resend.emails.send({
            from: 'ManeAccount <bounced@resend.dev>',
            to: [to],
            subject: subject,
            html: emailHtml,
        });

        if (error) {
            console.error('Email sending failed:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Email system error:', error);
        return { success: false, error };
    }
}

export async function sendVerificationCode({ to, code }: { to: string; code: string }) {
    if (!to) return;

    try {
        const emailHtml = await render(ManeAccountCodeEmail({ code }));

        const { data, error } = await resend.emails.send({
            from: 'ManeAccount <bounced@resend.dev>',
            to: [to],
            subject: 'Verify your email',
            html: emailHtml,
        });

        if (error) {
            console.error('Email sending failed:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Email system error:', error);
        return { success: false, error };
    }
}
