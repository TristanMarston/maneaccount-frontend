import * as React from 'react';
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link } from '@react-email/components';

interface ManeAccountEmailProps {
    previewText: string;
    heading: string;
    message: React.ReactNode;
    actionLabel?: string;
    actionUrl?: string;
}

export const ManeAccountEmail = ({ previewText, heading, message, actionLabel, actionUrl }: ManeAccountEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img style={image} src='https://maneaccount-frontend.vercel.app/maneaccount-logo.png'></Img>
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>{heading}</Heading>
                        <Text style={text}>{message}</Text>

                        {actionLabel && actionUrl && (
                            <Section style={btnContainer}>
                                <Button style={button} href={actionUrl}>
                                    {actionLabel}
                                </Button>
                            </Section>
                        )}

                        <Hr style={hr} />

                        <Text style={footer}>
                            This email was sent from ManeAccount. If you were not expecting this, please ignore it.
                            <br />
                            <Link href='https://maneaccount.com' style={link}>
                                View your dashboard
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default ManeAccountEmail;

const main = {
    backgroundColor: '#f5f5f4',
    fontFamily: 'HelveticaNeue, Helvetica, Arial, sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '40px auto 0',
    padding: '40px 20px 20px 20px',
    maxWidth: '600px',
    borderRadius: '20px 20px 0 0',
};

const header = {
    marginBottom: '10px',
    maxWidth: '200px',
    width: '100%',
    textAlign: 'center' as const,
};

const image = {
    maxWidth: '400px',
};

const content = {
    padding: '0 10px',
};

const h1 = {
    color: '#1c1917',
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '20px 0',
    fontFamily: 'Lusitana, Georgia, serif',
};

const text = {
    color: '#444',
    fontSize: '18px',
    lineHeight: '26px',
    textAlign: 'center' as const,
    fontFamily: 'Figtree, Verdana, sans-serif',
};

const btnContainer = {
    textAlign: 'center' as const,
    marginTop: '20px',
    marginBottom: '20px',
};

const button = {
    backgroundColor: '#538475',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '17px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    fontFamily: 'Figtree, Verdana, sans-serif',
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
    fontFamily: 'Figtree, Verdana, sans-serif',
};

const link = {
    color: '#538475',
    textDecoration: 'underline',
    fontFamily: 'Figtree, Verdana, sans-serif',
};
