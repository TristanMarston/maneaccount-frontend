import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link } from '@react-email/components';

interface ManeAccountEmailProps {
    senderName: string;
    message: string;
    showName: string;
    senderImage?: string | null;
}

export const ManeAccountNewMessageEmail = ({ senderName, message, showName, senderImage }: ManeAccountEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{`New message from ${senderName}`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img style={imageStyle} src='https://maneaccount.com/maneaccount-logo-white.png'></Img>
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>New Message</Heading>

                        {senderImage && senderImage.length > 0 && <Img style={profileImage} src={senderImage}></Img>}

                        <Text style={textBlock}>
                            <Text style={bold}>{senderName}</Text>
                            <Text style={normal}>&nbsp;sent you a message about&nbsp;</Text>
                            <Text style={bold}>{showName}:</Text>
                        </Text>

                        <Section style={messageContainer}>
                            <Text style={messageText}>"{message !== '' ? message : 'No message found.'}"</Text>
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

export default ManeAccountNewMessageEmail;

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
    fontStyle: 'italic',
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
