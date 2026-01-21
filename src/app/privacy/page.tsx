import { LegalPageLayout, Title, HeadingOne, HeadingTwo, Bold, BulletList, BulletItem, Paragraph } from '../_components/LegalHelper';

const PrivacyPage = () => {
    return (
        <LegalPageLayout>
            <Title>Privacy Policy</Title>
            <Paragraph>
                <Bold>Mane Account Website Application</Bold>
            </Paragraph>
            <Paragraph>
                <Bold>Last Updated:</Bold> January 1st, 2026
            </Paragraph>
            <Paragraph>
                Counter Canter Collective LLC, doing business as Mane Account (&quot;<Bold>Company</Bold>,&quot; &quot;<Bold>we</Bold>,&quot; &quot;<Bold>us</Bold>,&quot; or &quot;
                <Bold>our</Bold>&quot;), respects your privacy and is committed to protecting your personal information.
            </Paragraph>
            <Paragraph>
                This Privacy Policy describes how we collect, use, disclose, store, and protect information when you access or use the <Bold>Mane Account website application</Bold> and
                related services (collectively, the &quot;<Bold>Services</Bold>&quot;).
            </Paragraph>
            <Paragraph>By using the Services, you consent to the practices described in this Privacy Policy.</Paragraph>

            <HeadingOne>1. Data Collection</HeadingOne>
            <Paragraph>We collect information you provide directly, information collected automatically, and information from third-party platforms.</Paragraph>
            <HeadingTwo>1.1 Information You Provide</HeadingTwo>
            <BulletList>
                <BulletItem>Name</BulletItem>
                <BulletItem>Email address</BulletItem>
                <BulletItem>Account login credentials</BulletItem>
                <BulletItem>Communications with customer support</BulletItem>
                <BulletItem>Payment information (processed securely through third-party payment gateways)</BulletItem>
            </BulletList>
            <HeadingTwo>1.2 Subscription & Payment Information</HeadingTwo>
            <BulletList>
                <BulletItem>Subscription status</BulletItem>
                <BulletItem>Purchase history</BulletItem>
            </BulletList>
            <Paragraph>Payment processing is handled exclusively by Stripe. We do not collect or store credit card numbers or payment credentials.</Paragraph>
        </LegalPageLayout>
    );
};

export default PrivacyPage;
