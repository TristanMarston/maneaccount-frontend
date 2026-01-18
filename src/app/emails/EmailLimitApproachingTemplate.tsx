import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link } from '@react-email/components';

interface ManeAccountEmailProps {
    count: number;
    limit: number;
    period: string;
    type: 'approaching' | 'exceeded';
    barnName?: string | null;
}

export const ManeAccountLimitEmail = ({ count, limit, period, type, barnName }: ManeAccountEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{type === 'approaching' ? 'Approaching Horse Limit' : 'Horse Limit Exceeded'}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img style={imageStyle} src='https://maneaccount.com/maneaccount-logo-white.png'></Img>
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>{type === 'approaching' ? 'Approaching Horse Limit' : 'Horse Limit Exceeded'}</Heading>

                        <Text style={textBlock}>
                            <Text style={bold}>Heads up!</Text>
                            <Text style={normal}>
                                &nbsp;{type === 'approaching' ? `You are approaching your service limit for this ${period}` : `Your service limit has been reached for this ${period}`}
                            </Text>
                        </Text>

                        <Section style={messageContainer}>
                            <Text style={messageText}>
                                {type === 'approaching' ? (
                                    <span>
                                        It looks like you're having a great week! You have serviced <span style={{ fontWeight: 'bold' }}>{count}</span> horses and are almost at your{' '}
                                        {period === 'week' ? 'weekly' : period === 'day' ? 'daily' : 'weekly'} limit of <span style={{ fontWeight: 'bold' }}>{limit}</span> horses. To
                                        make sure you can continue accommodating your customers and the demands of your success, please upgrade your subscription to grow your account.
                                    </span>
                                ) : (
                                    <span>
                                        <span style={{ fontWeight: barnName ? 'bold' : 'normal' }}>{barnName ? barnName : 'One of your clients'}</span>&nbsp;has requested more horses
                                        than the {limit}-horse limit allowed under your current package. Please upgrade your subscription so you can accommodate your client and maintain
                                        a healthy business.
                                    </span>
                                )}
                            </Text>
                        </Section>

                        <Button style={button} href='https://maneaccount.com/dashboard'>
                            Go to Dashboard
                        </Button>

                        <Hr style={hr} />

                        <Text style={footer}>
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

export default ManeAccountLimitEmail;

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

const messageContainer = {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    margin: '20px auto',
    textAlign: 'left' as const,
    borderLeft: '4px solid #538475',
};

const messageText = {
    color: '#444',
    fontSize: '16px',
    lineHeight: '24px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
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
