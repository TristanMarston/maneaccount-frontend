import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link } from '@react-email/components';

interface ManeAccountEmailProps {
    barnName: string;
    amount: string;
    showName: string;
    date: string;
}

export const ManeAccountJobPaidEmail = ({ barnName, amount, showName, date }: ManeAccountEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{`Payment received from ${barnName}`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img style={imageStyle} src='https://maneaccount.com/maneaccount-logo-white.png'></Img>
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>Payment Received</Heading>

                        <Text style={textBlock}>
                            <Text style={bold}>{barnName}</Text>
                            <Text style={normal}> has marked your job at </Text>
                            <Text style={bold}>{showName}</Text>
                            <Text style={normal}> as paid.</Text>
                        </Text>

                        <Text style={amountText}>{amount}</Text>

                        <Section style={detailsContainer}>
                            <Text style={detailRow}>
                                <span style={label}>Date:</span> {date}
                            </Text>
                        </Section>

                        <Button style={button} href='https://maneaccount.com/dashboard'>
                            View Payment
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

export default ManeAccountJobPaidEmail;

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

const amountText = {
    textAlign: 'center' as const,
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#538475',
    margin: '20px 0',
    fontFamily: 'Lusitana, EB Garamond, Georgia, serif',
};

const bold = {
    color: '#444',
    fontSize: '18px',
    lineHeight: '26px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    display: 'inline-block',
    fontWeight: 'bold',
    margin: '4px 0',
};

const normal = {
    color: '#444',
    fontSize: '18px',
    lineHeight: '26px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    display: 'inline-block',
    fontWeight: 'normal',
    margin: '4px 0',
};

const detailsContainer = {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    margin: '20px auto',
    textAlign: 'left' as const,
};

const detailRow = {
    color: '#444',
    fontSize: '16px',
    lineHeight: '24px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    margin: '4px 0',
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
