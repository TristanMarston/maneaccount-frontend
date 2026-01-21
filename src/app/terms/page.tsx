import { LegalPageLayout, Title, HeadingOne, HeadingTwo, Bold, BulletList, BulletItem, Paragraph } from '../_components/LegalHelper';

const TermsPage = () => {
    return (
        <LegalPageLayout>
            <Title>Terms of Service</Title>
            <Paragraph>
                <Bold>Mane Account Website Application</Bold>
            </Paragraph>
            <Paragraph>
                <Bold>Last Updated:</Bold> January 1st, 2026
            </Paragraph>
            <Paragraph>
                These Terms and Conditions (&quot;<Bold>Terms</Bold>&quot;) govern your access to and use of the Mane Account website application and related services (collectively, the
                &quot;
                <Bold>App</Bold>&quot;), operated by
                <Bold>Counter Canter Collective LLC</Bold>, doing business as Mane Account (&quot;<Bold>Company</Bold>,&quot; &quot;<Bold>we</Bold>,&quot; &quot;<Bold>us</Bold>,&quot; or &quot;
                <Bold>our</Bold>&quot;).
            </Paragraph>
            <Paragraph>By accessing or using the App, you agree to be bound by these Terms. If you do not agree, do not use the App.</Paragraph>

            <HeadingOne>1. Purpose of the App</HeadingOne>
            <Paragraph>
                Mane Account is a digital platform designed to support professional equestrian braiders by offering tools including, but not limited to, scheduling, booking management,
                invoicing, client visibility, and subscription-based professional features.
            </Paragraph>
            <Paragraph>
                The Company <Bold>does not provide equestrian braiding services</Bold>, does not employ or supervise braiders, and is not responsible for services rendered by users of
                the App.
            </Paragraph>

            <HeadingOne>2. Eligibility</HeadingOne>
            <Paragraph>
                You must be at least <Bold>18 years old</Bold> to use the App. By using the App, you represent and warrant that you have the legal capacity to enter into this agreement.
            </Paragraph>

            <HeadingOne>3. Account Registration</HeadingOne>
            <Paragraph>You agree to:</Paragraph>
            <BulletList>
                <BulletItem>Provide accurate, current, and complete information.</BulletItem>
                <BulletItem>Maintain the confidentiality of your login credentials.</BulletItem>
                <BulletItem>Accept responsibility for all activity that occurs under your account.</BulletItem>
            </BulletList>
            <Paragraph>You are responsible for promptly notifying us of any unauthorized use of your account.</Paragraph>

            <HeadingOne>4. Subcriptions & Payments</HeadingOne>
            <HeadingTwo>4.1 Subscription Plans</HeadingTwo>
            <Paragraph>
                Access to App features is provided through paid subscription plans. Available plans, pricing, features, and billing cycles are displayed within the App and at checkout.
            </Paragraph>
            <Paragraph>Pricing may vary by region and is subject to applicable taxes.</Paragraph>
            <HeadingTwo>4.2 Auto-Renewal</HeadingTwo>
            <Paragraph>
                Subscriptions automatically renew unless canceled at least <Bold>24 hours before</Bold> the end of the current billing period.
            </Paragraph>
            <HeadingTwo>4.3 Cancellation</HeadingTwo>
            <Paragraph>
                You may cancel your subscription at any time through the App&apos;s subscription settings. Cancellation becomes effective at the end of the current
                billing cycle.
            </Paragraph>
            <HeadingTwo>4.4 Refunds</HeadingTwo>
            <Paragraph>
                All payments are <Bold>non-refundable</Bold>, except where required by applicable law or platform policies.
            </Paragraph>

            <HeadingOne>5. Disclaimer &ndash; No Professional or Guaranteed Services</HeadingOne>
            <Paragraph>The Company does not:</Paragraph>
            <BulletList>
                <BulletItem>Supervise, verify, or endorse braiders.</BulletItem>
                <BulletItem>Guarantee bookings, income, visibility, or business success.</BulletItem>
                <BulletItem>Provide professional, legal, medical, or financial advice</BulletItem>
            </BulletList>
            <Paragraph>
                All services are provided independently by users. <Bold>Equestrian activities involve inherent risks</Bold>, and users assume all risks associated with their
                participation.
            </Paragraph>

            <HeadingOne>6. User Conduct</HeadingOne>
            <Paragraph>You agree not to:</Paragraph>
            <BulletList>
                <BulletItem>Misrepresent your identity or services.</BulletItem>
                <BulletItem>Harass, abuse, or harm other users.</BulletItem>
                <BulletItem>Use the App for unlawful purposes.</BulletItem>
                <BulletItem>Attempt to bypass subscription features, fees, or security measures.</BulletItem>
                <BulletItem>Interfere with the App&apos;s operation or integrity.</BulletItem>
            </BulletList>

            <HeadingOne>7. User Content & License</HeadingOne>
            <Paragraph>
                You retain ownership of content you submit to the App. By submitting content, you grant the Company a <Bold>non-exclusive, royalty-free, worldwide license</Bold> to use,
                host, store, display, and process such content solely to operate, maintain, and improve the App.
            </Paragraph>

            <HeadingOne>8. Intellectual Property</HeadingOne>
            <Paragraph>
                All App content, software, trademarks, logos, and designs are owned by the Company or its licensors and are protected by intellectual property laws. No rights are
                granted except as expressly stated.
            </Paragraph>

            <HeadingOne>9. Service Availability</HeadingOne>
            <Paragraph>
                The App is provided on an &quot;<Bold>as is</Bold>&quot; and &quot;<Bold>as available</Bold>&quot; basis. We do not guarantee uninterrupted or error-free operation and
                are not liable for outages, delays, maintenance, or technical issues.
            </Paragraph>

            <HeadingOne>10. Termination</HeadingOne>
            <Paragraph>
                We reserve the right to suspend or terminate your account at our discretion for violations of these Terms or misuse of the App. Upon termination, your access to the App
                will immediately cease.
            </Paragraph>

            <HeadingOne>11. Limitation of Liability</HeadingOne>
            <Paragraph>To the maximum extent permitted by law, the Company shall not be liable for:</Paragraph>
            <BulletList>
                <BulletItem>Disputes between users.</BulletItem>
                <BulletItem>Injuries, damages, or losses arising from equestrian activities.</BulletItem>
                <BulletItem>Lost income, bookings, data, or business opportunities.</BulletItem>
                <BulletItem>Technical failures or service interruptions.</BulletItem>
            </BulletList>
            <Paragraph>Use of the App is entirely at your own risk.</Paragraph>

            <HeadingOne>12. Indemnification</HeadingOne>
            <Paragraph>
                You agree to indemnify, defend, and hold harmless the Company and its affiliates from any claims, liabilities, damages, or expenses arising out of your use of the App,
                violation of these Terms, or services you provide.
            </Paragraph>

            <HeadingOne>13. Dispute Resolution & Arbitration</HeadingOne>
            <Paragraph>
                Any dispute arising out of or relating to these Terms or the App shall be resolved by <Bold>binding arbitration</Bold> administered by the{' '}
                <Bold>American Arbitration Association</Bold> under its Commercial Arbitration Rules.
            </Paragraph>
            <Paragraph>
                Arbitration shall be conducted on an <Bold>individual basis only</Bold>. You waive any right to participate in a class, collective, or representative action.
            </Paragraph>

            <HeadingOne>14. Governing Law & Venue</HeadingOne>
            <Paragraph>
                These Terms are governed by the laws of the <Bold>State of Nevada</Bold>, without regard to conflict of law principles. Any legal action not subject to arbitration shall
                be brought exclusively in the state or federal courts located in <Bold>Clark County, Nevada</Bold>.
            </Paragraph>

            <HeadingOne>15. Assignment</HeadingOne>
            <Paragraph>The Company may assign these Terms without restriction. Users may not assign their rights without prior written consent.</Paragraph>

            <HeadingOne>16. Changes to Terms</HeadingOne>
            <Paragraph>We may modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the updated Terms.</Paragraph>

            <HeadingOne>17. Contact Information</HeadingOne>
            <Paragraph>
                <Bold>Email:&nbsp;</Bold>
                <a href='mailto:support@maneaccount.com'>support@maneaccount.com</a>
            </Paragraph>
            <Paragraph>
                <Bold>Company:&nbsp;</Bold>Counter Canter Collective LLC
            </Paragraph>
            <Paragraph>
                <Bold>DBA:&nbsp;</Bold>Mane Account
            </Paragraph>
        </LegalPageLayout>
    );
}

export default TermsPage;