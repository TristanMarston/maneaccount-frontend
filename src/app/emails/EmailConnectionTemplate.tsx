import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link } from '@react-email/components';

interface ManeAccountEmailProps {
    message: string;
    image?: string | null;
}

export const ManeAccountConnectionRequestEmail = ({ message, image }: ManeAccountEmailProps) => {
    const hasPeriod = message.indexOf('.') !== -1;
    let name = '';
    let action = '';

    if (message.indexOf(' sent you a connection request') !== -1) {
        name = message.split(' sent you a connection request')[0];
        action = 'sent you a connection request';
    } else if (message.indexOf(' invited you to their team') !== -1) {
        name = message.split(' invited you to their team')[0];
        action = 'invited you to their team';
    } else if (message.indexOf(' wants to join your team') !== -1) {
        name = message.split(' wants to join your team')[0];
        action = 'wants to join your team';
    } else {
        action = message;
    }

    return (
        <Html>
            <Head />
            <Preview>{message}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img style={imageStyle} src='https://maneaccount.com/maneaccount-logo-white.png'></Img>
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>New Connection Request</Heading>
                        <Img style={profileImage} src={image || 'https://maneaccount.com/email-badge-user.png'}></Img>

                        <Text style={textBlock}>
                            <Text style={bold}>{name}</Text>{' '}
                            <Text style={normal}>
                                {action}
                                {hasPeriod ? '' : '.'}
                            </Text>
                        </Text>

                        <Button style={button} href='https://maneaccount.com/dashboard'>
                            Go to Dashboard
                        </Button>

                        <Hr style={hr} />

                        <Text style={footer}>
                            If you do not know this person or do not wish to connect, you can safely ignore this email.
                            <br />
                            <Link href='https://maneaccount.com' style={link}>
                                maneaccount.com
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default ManeAccountConnectionRequestEmail;

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

const textBlock = {
    textAlign: 'center' as const,
    margin: '10px 0',
};

const h1 = {
    color: '#1c1917',
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '20px 0 10px 0',
    fontFamily: 'Lusitana, EB Garamond, Georgia, serif',
};

const bold = {
    color: '#444',
    fontSize: '18px',
    lineHeight: '26px',
    textAlign: 'center' as const,
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    display: 'inline-block',
    fontWeight: 'bold',
    margin: '0',
};

const normal = {
    color: '#444',
    fontSize: '18px',
    lineHeight: '26px',
    textAlign: 'center' as const,
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    display: 'inline-block',
    fontWeight: 'normal',
    margin: '0',
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
    margin: '0',
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

const link = {
    color: '#538475',
    textDecoration: 'underline',
    fontFamily: 'Figtree, Helvetica, Verdana, sans-serif',
};
