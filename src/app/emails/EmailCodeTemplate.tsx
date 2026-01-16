import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link } from '@react-email/components';

interface ManeAccountEmailProps {
    code: string;
}

export const ManeAccountCodeEmail = ({ code }: ManeAccountEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Your verification code is {code}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img style={image} src='https://maneaccount.com/maneaccount-logo-white.png'></Img>
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>Verify your email</Heading>
                        <Text style={text}>Please enter the following code to verify your email address. This code will expire in 15 minutes.</Text>

                        <Section style={codeContainer}>
                            <Text style={codeText}>
                                {code.substring(0, 3)}&ndash;{code.substring(3)}
                            </Text>
                        </Section>

                        <Hr style={hr} />

                        <Text style={footer}>
                            If you didn't request this code, you can safely ignore this email. Never share or distribute this code.
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

export default ManeAccountCodeEmail;

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

const image = {
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

const text = {
    color: '#444',
    fontSize: '18px',
    lineHeight: '26px',
    textAlign: 'center' as const,
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
};

const codeContainer = {
    backgroundColor: '#eef5f1',
    borderRadius: '8px',
    border: '1px solid #69a190',
    padding: '16px',
    margin: '32px 0',
    textAlign: 'center' as const,
};

const codeText = {
    color: '#166534',
    fontSize: '32px',
    lineHeight: '24px',
    fontWeight: '900',
    letterSpacing: '4px',
    margin: '0',
    fontFamily: 'Figtree, Helvetica, Verdana, sans-serif',
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
