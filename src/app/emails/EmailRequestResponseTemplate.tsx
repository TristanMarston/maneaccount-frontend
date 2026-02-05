import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link } from '@react-email/components';

interface ManeAccountEmailProps {
    message: string;
    connection: boolean;
    image?: string | null;
    link?: string;
    date?: string;
}

export const ManeAccountRequestResponseEmail = ({ message, connection, image, link, date }: ManeAccountEmailProps) => {
    const hasPeriod = message.indexOf('.') !== -1;
    const accepted = message.indexOf('accepted') !== -1;
    let name = '';
    let action = '';
    let show = '';

    if (message.indexOf(' accepted your team invitation') !== -1) {
        name = message.split(' accepted your team invitation')[0];
        action = 'accepted your team invitation';
    } else if (message.indexOf(' rejected your team invitation') !== -1) {
        name = message.split(' rejected your team invitation')[0];
        action = 'rejected your team invitation';
    } else if (message.indexOf(' accepted your connection request') !== -1) {
        name = message.split(' accepted your connection request')[0];
        action = 'accepted your connection request';
    } else if (message.indexOf(' rejected your connection request') !== -1) {
        name = message.split(' rejected your connection request')[0];
        action = 'rejected your connection request';
    } else if (message.indexOf(' your job request for ') !== -1) {
        const start = message.split(' your job request for ')[0];
        show = message.split(' your job request for ')[1];

        if (start.indexOf(' accepted') !== -1) {
            name = start.split(' accepted')[0];
            action = 'accepted';
        } else if (start.indexOf(' denied') !== -1) {
            name = start.split(' denied')[0];
            action = 'denied';
        }
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
                        <Heading style={h1}>{connection ? 'Invite Response' : 'Job Request Response'}</Heading>
                        <Img style={{ ...profileImage, border: image && image.length > 0 ? '2px solid #3f6559' : 'none' }} src={image || (accepted ? 'https://maneaccount.com/email-badge-check.png' : 'https://maneaccount.com/email-badge-user-x.png')}></Img>

                        <Text style={textBlock}>
                            <Text style={bold}>{name}</Text>{' '}
                            {connection ? (
                                <Text style={normal}>
                                    {action}
                                    {hasPeriod ? '' : '.'}
                                </Text>
                            ) : (
                                <>
                                    <Text style={normal}>{action} your job request for&nbsp;</Text>
                                    <Text style={bold}>{show}</Text>
                                </>
                            )}
                        </Text>

                        <Button style={button} href={link || 'https://maneaccount.com/dashboard'}>
                            Go to Dashboard
                        </Button>

                        <Hr style={hr} />

                        <Text style={footer}>
                            You received this email because you enabled notifications for {connection ? 'connection responses' : 'job request responses'}. You can disable these notifications in your dashboard settings.
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

export default ManeAccountRequestResponseEmail;

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

const linkStyle = {
    color: '#538475',
    textDecoration: 'underline',
    fontFamily: 'Figtree, Helvetica, Verdana, sans-serif',
};
