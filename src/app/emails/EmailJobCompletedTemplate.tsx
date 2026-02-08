import { parseUTCToLocal } from '@/lib/date-utils';
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link } from '@react-email/components';
import { format } from 'date-fns';

interface ManeAccountEmailProps {
    braiderName: string;
    showName: string;
    horseName: string;
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
}

const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

export const ManeAccountJobCompletedEmail = ({ braiderName, showName, horseName, isClient, image, paymentInformation, serviceDetails }: ManeAccountEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{`Services completed for ${horseName} at ${showName}`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img style={imageStyle} src='https://maneaccount.com/maneaccount-logo-white.png'></Img>
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>Services Completed</Heading>
                        <Img style={{ ...profileImage, border: image ? '2px solid #3f6559' : 'none' }} src={image || 'https://maneaccount.com/email-badge-user.png'}></Img>

                        <Text style={textBlock}>
                            <Text style={bold}>{braiderName}</Text>
                            <Text style={normal}>&nbsp;{isClient ? 'has completed braiding services for you at' : 'has completed braiding services for your clients at'} &nbsp;</Text>
                            <Text style={bold}>{showName}</Text>
                            <Text style={normal}>.</Text>
                        </Text>

                        <Section style={detailsParent}>
                            <Section style={detailsContainer}>
                                <Text style={{ ...detailRow, fontSize: '20px', fontWeight: 'bold' }}>Day-by-day Breakdown of Completed Services:</Text>
                                {serviceDetails.map((dayRecord, i) =>
                                    Object.entries(dayRecord).map(([date, horses], j) => (
                                        <div key={`${i}-${j}`}>
                                            <Text
                                                style={{
                                                    ...detailRow,
                                                    fontWeight: 'bold',
                                                    fontSize: '16px',
                                                    marginTop: '12px',
                                                    borderBottom: '1px solid #ccc',
                                                    paddingBottom: '4px',
                                                }}
                                            >
                                                {format(parseUTCToLocal(new Date(date)) || new Date(date), 'PPPP')}
                                            </Text>
                                            {horses.map((horseData, k) => (
                                                <div key={k} style={{ marginBottom: '12px', paddingLeft: '12px', marginTop: '8px' }}>
                                                    <Text style={{ ...detailRow, fontWeight: 'bold', margin: '0 0 4px 0' }}>
                                                        {horseData.horseName.barnName}{' '}
                                                        <span style={{ fontWeight: 'normal', fontSize: '14px', color: '#666' }}>({horseData.horseName.showName})</span>
                                                    </Text>
                                                    <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                                                        {horseData.services.map((svc, l) => (
                                                            <li key={l} style={{ fontSize: '14px', color: '#444', marginBottom: '2px' }}>
                                                                {svc.name} {svc.subCharge && <span style={{ color: '#d97706', fontWeight: 'bold', fontSize: '12px' }}>(Expense)</span>} -{' '}
                                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(svc.price)}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )),
                                )}
                                <Hr style={hr} />
                                <Text style={{ ...detailRow, fontSize: '18px', fontWeight: 'bold', textAlign: 'right' }}>
                                    Total: $
                                    {serviceDetails
                                        .reduce((total, dayRecord) => {
                                            return (
                                                total +
                                                Object.values(dayRecord).reduce((dayTotal, horses) => {
                                                    return dayTotal + horses.reduce((horseTotal, horse) => horseTotal + horse.earnings, 0);
                                                }, 0)
                                            );
                                        }, 0)
                                        .toFixed(2)}
                                </Text>
                            </Section>
                        </Section>

                        {paymentInformation.venmo || paymentInformation.zelle ? (
                            <Section>
                                <Text style={{ ...bold, fontSize: '20px' }}>Select a payment method:</Text>
                                <Text style={{ ...italic, margin: '0 0 4px 0' }}>
                                    {isClient ? `Pay ${braiderName} or defer payment to your barn.` : `Pay ${braiderName} or defer payment to your clients.`}
                                </Text>
                                {paymentInformation.venmo && paymentInformation.venmo.trim() !== '' && (
                                    <Section style={detailsParent}>
                                        <Section
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#dbeafe',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                border: '1px solid #bfdbfe',
                                                margin: '0 0 8px 0',
                                                fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
                                            }}
                                        >
                                            <Text style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px', fontSize: '24px', display: 'inline-block' }}>Venmo:&nbsp;</Text>
                                            <Link href={paymentInformation.venmo} style={{ fontWeight: 'normal', color: '#3b82f6', fontSize: '24px', display: 'inline-block' }}>
                                                @{paymentInformation.venmo.substring(paymentInformation.venmo.indexOf('/u/') + 3)}
                                            </Link>
                                        </Section>
                                    </Section>
                                )}
                                {paymentInformation.zelle && paymentInformation.zelle.trim() !== '' && (
                                    <Section style={detailsParent}>
                                        <Section
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#f3e8ff',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                border: '1px solid #e9d5ff',
                                                margin: '0',
                                                fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
                                            }}
                                        >
                                            <Text style={{ fontWeight: 'bold', color: '#a855f7', marginBottom: '8px', fontSize: '24px', display: 'inline-block' }}>Zelle:&nbsp;</Text>
                                            <Text style={{ fontWeight: 'normal', color: '#a855f7', fontSize: '24px', display: 'inline-block' }}>
                                                {paymentInformation.zelle.indexOf('@') === -1 ? (
                                                    <span>{formatPhoneNumber(paymentInformation.zelle)}</span>
                                                ) : (
                                                    <span>
                                                        {paymentInformation.zelle.split('@')[0]}&zwnj;@{paymentInformation.zelle.split('.')[0].split('@')[1]}&zwnj;.
                                                        {paymentInformation.zelle.split('.')[1]}
                                                    </span>
                                                )}
                                            </Text>
                                        </Section>
                                    </Section>
                                )}
                            </Section>
                        ) : (
                            isClient && <Text style={italic}>No payment information provided for {braiderName}. Please contact your barn to complete payment.</Text>
                        )}

                        <Button style={button} href='https://maneaccount.com/dashboard'>
                            Go to Dashboard
                        </Button>

                        <Hr style={hr} />

                        <Text style={footer}>
                            ManeAccount does not process payments. Payments are processed through the payment processor of your choice. You received this email because you enabled
                            notifications for job completions. You can disable these notifications in your dashboard settings.
                            <br />
                            <Link href='https://maneaccount.com' style={linkStyle}>
                                maneaccount.com
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default ManeAccountJobCompletedEmail;

const main = {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica, HelveticaNeue, Arial, sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    maxWidth: '550px',
};

const header = {
    marginBottom: '16px',
    width: '100%',
    textAlign: 'center' as const,
    padding: '45px',
    backgroundColor: '#538475',
    border: '2px solid #3f6559',
    borderRadius: '14px',
};

const detailsParent = {
    margin: '0 auto',
    padding: '0',
};

const detailsContainer = {
    backgroundColor: '#eef5f1',
    border: '1px solid #69a190',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'left' as const,
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    margin: '0 0 10px 0',
};

const imageStyle = {
    maxWidth: '460px',
};

const content = {
    padding: '0 15px',
    textAlign: 'center' as const,
    border: '2px solid #3f6559',
    borderRadius: '14px',
};

const h1 = {
    color: '#1c1917',
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '20px 0 10px 0',
    fontFamily: 'Lusitana, EB Garamond, Georgia, serif',
};

const textBlock = {
    textAlign: 'center' as const,
    margin: '10px 0',
};

const bold = {
    color: '#444',
    fontSize: '18px',
    lineHeight: '26px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    display: 'inline-block',
    fontWeight: 'bold',
    margin: '0',
};

const normal = {
    color: '#444',
    fontSize: '18px',
    lineHeight: '26px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    display: 'inline-block',
    fontWeight: 'normal',
    margin: '0',
};

const italic = {
    color: '#8f8d8d',
    fontSize: '16px',
    lineHeight: '24px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    display: 'inline-block',
    fontWeight: 'normal',
    margin: '4px 0',
    fontStyle: 'italic',
};

const detailRow = {
    color: '#444',
    fontSize: '16px',
    lineHeight: '24px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    margin: '4px 0',
};

const profileImage = {
    width: '125px',
    height: '125px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    marginBottom: '16px',
    marginTop: '16px',
    textAlign: 'center' as const,
    margin: '0 auto',
    border: '2px solid #3f6559',
};

const label = {
    fontWeight: 'bold',
    marginRight: '8px',
};

const button = {
    backgroundColor: '#538475',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    margin: '20px 0 0 0',
};

const hr = {
    borderColor: '#e6e6e6',
    margin: '20px 0',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
    fontFamily: 'Figtree, Helvetica, Verdana, sans-serif',
};

const linkStyle = {
    color: '#538475',
    textDecoration: 'underline',
    fontFamily: 'Figtree, Helvetica, Verdana, sans-serif',
};
