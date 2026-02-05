import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Img, Hr, Link, Column, Row } from '@react-email/components';

interface ManeAccountEmailProps {
    showName: string;
    barnName: string;
    braiderName: string;
    horseCount: number;
    serviceCount: number;
    earnings: number;
    assignedHorses?: string[];
    isSubcontractor: boolean;
}

export const ManeAccountJobRequestEmail = ({ showName, barnName, braiderName, horseCount, serviceCount, earnings, assignedHorses, isSubcontractor }: ManeAccountEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{isSubcontractor ? `You have been assigned to horse(s) at ${showName}` : `New Job Request from ${isSubcontractor ? braiderName : barnName}`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img style={imageStyle} src='https://maneaccount.com/maneaccount-logo-white.png'></Img>
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>{isSubcontractor ? 'New Assignment' : 'New Job Request'}</Heading>

                        <Text style={textBlock}>
                            <Text style={bold}>{isSubcontractor ? braiderName : barnName}</Text>
                            <Text style={normal}>&nbsp;has requested braiding services for&nbsp;</Text>
                            <Text style={bold}>{showName}</Text>
                        </Text>

                        <Section style={detailsParent}>
                            <Section style={detailsContainer}>
                                <Text style={detailRow}>
                                    <Text style={label}>Total Horses:</Text> {horseCount}
                                </Text>
                                <Text style={detailRow}>
                                    <Text style={label}>Total Services:</Text> {serviceCount}
                                </Text>
                                <Text style={detailRow}>
                                    <Text style={label}>Potential Earnings:</Text> ${earnings}
                                </Text>
                            </Section>
                        </Section>

                        {isSubcontractor && assignedHorses && assignedHorses.length > 0 && (
                            <Section style={subListContainer}>
                                <Text style={bold}>Your Assigned Horses:</Text>
                                <ul style={ul}>
                                    {assignedHorses.map((horse, index) => (
                                        <li key={index} style={li}>
                                            {horse}
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        <Button style={button} href='https://maneaccount.com/dashboard'>
                            Go to Dashboard
                        </Button>

                        <Hr style={hr} />

                        <Text style={footer}>
                            You received this email because you enabled notifications for job requests. You can disable these notifications in your dashboard settings.
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

export default ManeAccountJobRequestEmail;

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

const detailsParent = {
    margin: '0 auto',
    padding: '0 40px',
};

const detailsContainer = {
    backgroundColor: '#eef5f1',
    border: '1px solid #69a190',
    padding: '16px 16px 0 16px',
    borderRadius: '8px',
    textAlign: 'left' as const,
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    fontSize: '17px',
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
    margin: '0 8px 0 0 ',
    display: 'inline-block',
    fontSize: '17px',
};

const subListContainer = {
    textAlign: 'left' as const,
    margin: '20px auto',
    padding: '0 10px',
};

const ul = {
    paddingLeft: '20px',
    marginTop: '10px',
};

const li = {
    color: '#444',
    fontSize: '16px',
    lineHeight: '24px',
    fontFamily: 'Figtree, Helvetica, HelveticaNeue, Verdana, sans-serif',
    marginBottom: '4px',
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
