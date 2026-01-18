import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { render } from '@react-email/render';
import ManeAccountCodeEmail from '@/app/emails/EmailCodeTemplate';
import ManeAccountConnectionRequestEmail from '@/app/emails/EmailConnectionTemplate';
import ManeAccountStatusChangeEmail, { ManeAccountRequestResponseEmail } from '@/app/emails/EmailRequestResponseTemplate';
import ManeAccountCalendarInviteEmail from '@/app/emails/EmailCalendarInviteTemplate';
import ManeAccountJobRequestEmail from '@/app/emails/EmailJobRequestTemplate';
import ManeAccountJobCompletedEmail from '@/app/emails/EmailJobCompletedTemplate';
import ManeAccountJobPaidEmail from '@/app/emails/EmailJobPaidTemplate';
import ManeAccountNewMessageEmail from '@/app/emails/EmailNewMessageTemplate';
import ManeAccountLimitApproachingEmail, { ManeAccountLimitEmail } from '@/app/emails/EmailLimitApproachingTemplate';

const ses = new SESClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function sendVerificationCode({ to, code }: { to: string; code: string }) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountCodeEmail({ code }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: 'Verify your email' },
                Body: {
                    Html: { Data: html },
                },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES verification email failed:', error);
        return { success: false, error };
    }
}

export async function sendConnectionRequestEmail({ to, message, image }: { to: string; message: string; image?: string | null }) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountConnectionRequestEmail({ message, image }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: 'Connection request' },
                Body: {
                    Html: { Data: html },
                },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES connection request email failed:', error);
        return { success: false, error };
    }
}

export async function sendStatusChangeEmail({
    to,
    message,
    connection,
    image,
    link,
    date,
}: {
    to: string;
    message: string;
    connection: boolean;
    image?: string | null;
    link?: string;
    date?: string;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountRequestResponseEmail({ message, connection, image, link, date }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: connection ? 'Connection Request' : 'Job Request' },
                Body: { Html: { Data: html } },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES status change email failed:', error);
        return { success: false, error };
    }
}

export async function sendCalendarInviteEmail({
    to,
    eventName,
    date,
    location,
    inviterName,
    message,
}: {
    to: string;
    eventName: string;
    date: string;
    location: string;
    inviterName: string;
    message?: string;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountCalendarInviteEmail({ eventName, date, location, inviterName, message }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: `Invitation: ${eventName}` },
                Body: { Html: { Data: html } },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES calendar invite email failed:', error);
        return { success: false, error };
    }
}

export async function sendJobRequestEmail({
    to,
    showName,
    barnName,
    braiderName,
    date,
    horseCount,
    serviceCount,
    assignedHorses,
    isSubcontractor,
    earnings,
}: {
    to: string;
    showName: string;
    barnName: string;
    braiderName: string;
    date: string;
    horseCount: number;
    serviceCount: number;
    assignedHorses?: string[];
    isSubcontractor: boolean;
    earnings: number;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountJobRequestEmail({ showName, barnName, braiderName, date, horseCount, serviceCount, assignedHorses, isSubcontractor, earnings }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: isSubcontractor ? `New Assignment: ${showName}` : `New Job Request: ${showName}` },
                Body: { Html: { Data: html } },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES job request email failed:', error);
        return { success: false, error };
    }
}

export async function sendJobCompletedEmail({
    to,
    braiderName,
    showName,
    horseName,
    isClient,
    image,
    paymentInformation,
    serviceDetails,
}: {
    to: string;
    braiderName: string;
    showName: string;
    horseName: string;
    isClient: boolean;
    image?: string;
    paymentInformation: { venmo?: string; zelle?: string };
    serviceDetails: { horseName: { showName: string; barnName: string }; serviceCount: number; earnings: number }[];
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountJobCompletedEmail({ braiderName, showName, horseName, isClient, image, paymentInformation, serviceDetails }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: `Services Completed: ${showName}` },
                Body: { Html: { Data: html } },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES job completed email failed:', error);
        return { success: false, error };
    }
}

export async function sendJobPaidEmail({
    to,
    barnName,
    amount,
    showName,
    paymentMethod,
    image,
}: {
    to: string;
    barnName: string;
    amount: number;
    showName: string;
    paymentMethod: string;
    image?: string;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountJobPaidEmail({ barnName, amount, showName, paymentMethod, image }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: `Payment Received: ${showName}` },
                Body: { Html: { Data: html } },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES job paid email failed:', error);
        return { success: false, error };
    }
}

export async function sendNewMessageEmail({
    to,
    senderName,
    message,
    senderImage,
    showName,
}: {
    to: string;
    senderName: string;
    message: string;
    senderImage?: string | null;
    showName: string;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountNewMessageEmail({ senderName, message, senderImage, showName }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: `New Message from ${senderName}` },
                Body: { Html: { Data: html } },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES new message email failed:', error);
        return { success: false, error };
    }
}

export async function sendLimitEmail({ to, count, limit, period, type, barnName }: { to: string; count: number; limit: number; period: string; type: 'approaching' | 'exceeded'; barnName?: string | null }) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountLimitEmail({ count, limit, period, type, barnName }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: 'Usage Limit Approaching' },
                Body: { Html: { Data: html } },
            },
        });

        await ses.send(command);
        return { success: true };
    } catch (error) {
        console.error('SES limit approaching email failed:', error);
        return { success: false, error };
    }
}
