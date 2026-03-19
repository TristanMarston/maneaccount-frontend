import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { render } from '@react-email/render';
import { createEvent, EventAttributes } from 'ics';
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
            Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
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
            Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
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
            Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
            Message: {
                Subject: { Data: connection ? 'Connection Response' : 'Job Response' },
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

async function generateIcs(eventName: string, startDate: Date, endDate: Date, location: string, inviterName: string, description?: string): Promise<string> {
    const start: [number, number, number] = [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()];

    // ICS end date is exclusive for all-day events, so add 1 day
    const exclusiveEnd = new Date(endDate);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
    const end: [number, number, number] = [exclusiveEnd.getFullYear(), exclusiveEnd.getMonth() + 1, exclusiveEnd.getDate()];

    const event: EventAttributes = {
        start,
        end,
        title: eventName,
        description: description || `Invitation from ${inviterName}`,
        location,
        url: 'https://maneaccount.com/dashboard',
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        organizer: { name: 'ManeAccount', email: 'no-reply@maneaccount.com' },
    };

    return new Promise((resolve) => {
        createEvent(event, (error, value) => {
            if (error) {
                console.error('Error generating ICS:', error);
                resolve('');
            } else {
                resolve(value);
            }
        });
    });
}

export async function sendCalendarInviteEmail({
    to,
    eventName,
    startDate,
    endDate,
    location,
    inviterName,
    message,
}: {
    to: string;
    eventName: string;
    startDate: Date;
    endDate: Date;
    location: string;
    inviterName: string;
    message?: string;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const dateStr = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        const html = await render(ManeAccountCalendarInviteEmail({ eventName, date: dateStr, location, inviterName, message }));
        const icsContent = await generateIcs(eventName, startDate, endDate, location, inviterName, message);

        if (icsContent) {
            const boundary = `__ManeAccount_Boundary_${Date.now()}__`;
            const rawMessage = [
                `From: ManeAccount <${process.env.SES_FROM_EMAIL}>`,
                `To: ${to}, tristan@ericmarston.com`,
                `Subject: Invitation: ${eventName}`,
                'MIME-Version: 1.0',
                `Content-Type: multipart/mixed; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: 7bit',
                '',
                html,
                '',
                `--${boundary}`,
                'Content-Type: text/calendar; method=REQUEST; name="invite.ics"',
                'Content-Disposition: attachment; filename="invite.ics"',
                'Content-Transfer-Encoding: base64',
                '',
                Buffer.from(icsContent).toString('base64'),
                '',
                `--${boundary}--`,
            ].join('\r\n');

            const command = new SendRawEmailCommand({
                RawMessage: { Data: Buffer.from(rawMessage) },
            });

            await ses.send(command);
        } else {
            const command = new SendEmailCommand({
                Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
                Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
                Message: {
                    Subject: { Data: `Invitation: ${eventName}` },
                    Body: { Html: { Data: html } },
                },
            });

            await ses.send(command);
        }

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
    horseCount: number;
    serviceCount: number;
    assignedHorses?: string[];
    isSubcontractor: boolean;
    earnings: number;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountJobRequestEmail({ showName, barnName, braiderName, horseCount, serviceCount, assignedHorses, isSubcontractor, earnings }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
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
    thanksMessage,
    isClient,
    image,
    paymentInformation,
    serviceDetails,
    horseExpenses,
    horseDetails,
}: {
    to: string;
    braiderName: string;
    showName: string;
    horseName: string;
    thanksMessage: string;
    isClient: boolean;
    image?: string;
    paymentInformation: { venmo?: string; zelle?: string };
    serviceDetails: Record<
        string,
        {
            horseName: {
                showName: string;
                barnName: string;
            };
            services: {
                price: number;
                name: string;
                subCharge: boolean;
            }[];
            earnings: number;
            client: any;
        }[]
    >[];
    horseDetails: Record<
        string,
        Record<
            string,
            {
                days: Date[];
                price: number;
            }
        >
    >;
    horseExpenses?: Record<string, number>;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(
            ManeAccountJobCompletedEmail({ braiderName, showName, horseName, isClient, image, paymentInformation, serviceDetails, horseDetails, horseExpenses, thanksMessage }),
        );

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
            Message: {
                Subject: { Data: `${isClient ? 'BRAIDING PAYMENT REQUIRED - ' : ''}Services Completed: ${showName}` },
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
            Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
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
            Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
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

export async function sendLimitEmail({
    to,
    count,
    limit,
    period,
    type,
    barnName,
}: {
    to: string;
    count: number;
    limit: number;
    period: string;
    type: 'approaching' | 'exceeded';
    barnName?: string | null;
}) {
    if (!to) return { error: 'No email provided' };

    try {
        const html = await render(ManeAccountLimitEmail({ count, limit, period, type, barnName }));

        const command = new SendEmailCommand({
            Source: `ManeAccount <${process.env.SES_FROM_EMAIL}>`,
            Destination: { ToAddresses: ['tristan@ericmarston.com', to] },
            Message: {
                Subject: { Data: type === 'approaching' ? 'Approaching Horse Limit' : 'Horse Limit Exceeded' },
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
