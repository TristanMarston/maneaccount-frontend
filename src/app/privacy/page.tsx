import Link from 'next/link';
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

            <HeadingOne>1. Information We Collect</HeadingOne>
            <Paragraph>We collect information you provide directly, information collected automatically, and information from third-party platforms.</Paragraph>
            <HeadingTwo>1.1 Information You Provide</HeadingTwo>
            <BulletList>
                <BulletItem>Name</BulletItem>
                <BulletItem>Email address</BulletItem>
                <BulletItem>Account login credentials</BulletItem>
                <BulletItem>Profile and business information (including service descriptions, availability, and location)</BulletItem>
            </BulletList>
            <HeadingTwo>1.2 Subscription & Payment Information</HeadingTwo>
            <BulletList>
                <BulletItem>Subscription status</BulletItem>
                <BulletItem>Purchase history</BulletItem>
            </BulletList>
            <Paragraph>Payment processing is handled exclusively by Stripe. We do not collect or store credit card numbers or payment credentials.</Paragraph>
            <HeadingTwo>1.3 Automatically Collected Information</HeadingTwo>
            <BulletList>
                <BulletItem>Device type and operating system</BulletItem>
                <BulletItem>IP address or approximate location</BulletItem>
                <BulletItem>App usage data and interactions</BulletItem>
                <BulletItem>Log files, diagnostics, and crash data</BulletItem>
            </BulletList>
            <HeadingTwo>1.4 Information from Third Parties</HeadingTwo>
            <BulletList>
                <BulletItem>Analytics or performance metrics from service providers</BulletItem>
            </BulletList>

            <HeadingOne>2. How We Use Your Information</HeadingOne>
            <Paragraph>We use personal information to:</Paragraph>
            <BulletList>
                <BulletItem>Operate, maintain, and improve the Services</BulletItem>
                <BulletItem>Create and manage user accounts</BulletItem>
                <BulletItem>Process subscriptions and verify eligibility</BulletItem>
                <BulletItem>Communicate service updates and support responses</BulletItem>
                <BulletItem>Monitor security, prevent fraud, and enforce our Terms</BulletItem>
                <BulletItem>Comply with legal and regulatory obligations</BulletItem>
            </BulletList>
            <Paragraph>We do not use personal data for automated decision-making that produces legal or similarly significant effects.</Paragraph>

            <HeadingOne>3. Legal Bases for Processing (GDPR)</HeadingOne>
            <Paragraph>For users in jurisdictions requiring a legal basis (including the European Union), we process personal data under one or more of the following:</Paragraph>
            <BulletList>
                <BulletItem>Performance of a contract</BulletItem>
                <BulletItem>User consent</BulletItem>
                <BulletItem>Legitimate business interests</BulletItem>
                <BulletItem>Compliance with legal obligations</BulletItem>
            </BulletList>

            <HeadingOne>4. Data Sharing & Disclosure</HeadingOne>
            <Paragraph>
                We do <Bold>not</Bold> sell or rent personal information.
            </Paragraph>
            <Paragraph>We may share information only with:</Paragraph>
            <BulletList>
                <BulletItem>Service providers necessary to operate and maintain the Services (such as hosting, analytics, and customer support)</BulletItem>
                <BulletItem>Payment platforms (Stripe)</BulletItem>
                <BulletItem>Legal authorities when required by law, regulation, or court order</BulletItem>
                <BulletItem>Parties involved in a merger, acquisition, or sale of assets</BulletItem>
            </BulletList>
            <Paragraph>All service providers are contractually obligated to protect your information.</Paragraph>

            <HeadingOne>5. Data Retention</HeadingOne>
            <Paragraph>We retain personal information for as long as necessary to:</Paragraph>
            <BulletList>
                <BulletItem>Provide and support the Services</BulletItem>
                <BulletItem>Maintain account and subscription records</BulletItem>
                <BulletItem>Comply with legal and regulatory obligations</BulletItem>
                <BulletItem>Resolve disputes and enforce agreements</BulletItem>
            </BulletList>
            <Paragraph>When information is no longer required, it is securely deleted or anonymized.</Paragraph>

            <HeadingOne>6. Data Security</HeadingOne>
            <Paragraph>We implement commercially reasonable administrative, technical, and physical safeguards designed to protect personal information.</Paragraph>
            <Paragraph>However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.</Paragraph>

            <HeadingOne>7. User Rights & Choices</HeadingOne>
            <Paragraph>Depending on your jurisdiction, you may have the right to:</Paragraph>
            <BulletList>
                <BulletItem>Access your personal data</BulletItem>
                <BulletItem>Correct inaccurate or incomplete information</BulletItem>
                <BulletItem>Request deletion of personal data</BulletItem>
                <BulletItem>Withdraw consent where applicable</BulletItem>
                <BulletItem>Object to certain data processing activities</BulletItem>
            </BulletList>
            <Paragraph>
                Requests may be submitted to{' '}
                <Bold>
                    <Link href='mailto:connect.mane.team@gmail.com'>connect.mane.team@gmail.com</Link>
                </Bold>
                .
            </Paragraph>
            <Paragraph>We may verify your identity before responding.</Paragraph>

            <HeadingOne>8. Californian Privacy Rights (CCPA / CPRA)</HeadingOne>
            <Paragraph>California residents have the right to:</Paragraph>
            <BulletList>
                <BulletItem>Know what personal information we collect</BulletItem>
                <BulletItem>Request deletion or correction of personal information</BulletItem>
                <BulletItem>Opt out of the sale or sharing of personal data (we do not sell personal data)</BulletItem>
                <BulletItem>Be free from discrimination for exercising privacy rights</BulletItem>
            </BulletList>
            <Paragraph>
                Requests may be submitted to{' '}
                <Bold>
                    <Link href='mailto:connect.mane.team@gmail.com'>connect.mane.team@gmail.com</Link>
                </Bold>
                .
            </Paragraph>

            <HeadingOne>9. International Data Transfers</HeadingOne>
            <Paragraph>The Services are operated from the United States.</Paragraph>
            <Paragraph>
                If you access the Services from outside the U.S., you acknowledge and consent to the transfer, storage, and processing of your information in the United States, which
                may have different data protection laws than your jurisdiction.
            </Paragraph>

            <HeadingOne>10. Children&apos;s Privacy</HeadingOne>
            <Paragraph>The Services are not intended for individuals under the age of 18.</Paragraph>
            <Paragraph>We do not knowingly collect personal information from minors. If such information is discovered, it will be promptly deleted.</Paragraph>

            <HeadingOne>11. Accessibility</HeadingOne>
            <Paragraph>
                Mane Account is committed to making its Services accessible and usable for as many people as reasonably possible, including individuals with disabilities.
            </Paragraph>
            <Paragraph>
                We strive to follow generally recognized accessibility standards, including the Web Content Accessibility Guidelines (WCAG), where feasible, and to improve accessibility
                over time.
            </Paragraph>
            <Paragraph>
                If you experience difficulty accessing any part of the Services or require assistance, please contact us at{' '}
                <Bold>
                    <Link href='mailto:connect.mane.team@gmail.com'>connect.mane.team@gmail.com</Link>
                </Bold>
                . We will make reasonable efforts to address accessibility concerns in a timely manner.
            </Paragraph>

            <HeadingOne>12. Third-Party Links</HeadingOne>
            <Paragraph>The Services may contain links to third-party websites or services.</Paragraph>
            <Paragraph>
                We are not responsible for the privacy practices or content of third parties. Use of third-party services is governed by their respective privacy policies.
            </Paragraph>

            <HeadingOne>13. Changes to This Privacy Policy</HeadingOne>
            <Paragraph>We may update this Privacy Policy from time to time.</Paragraph>
            <Paragraph>Changes become effective upon posting. Continued use of the Services constitutes acceptance of the updated policy.</Paragraph>

            <HeadingOne>14. Contact Information</HeadingOne>
            <Paragraph>If you have questions, concerns, or privacy requests, please contact:</Paragraph>
            <Paragraph>
                <Bold>Email:&nbsp;</Bold>
                <Link href='mailto:connect.mane.team@gmail.com'>connect.mane.team@gmail.com</Link>
            </Paragraph>
            <Paragraph>
                <Bold>Company:&nbsp;</Bold>Counter Canter Collective LLC
            </Paragraph>
            <Paragraph>
                <Bold>DBA:&nbsp;</Bold>Mane Account
            </Paragraph>

            <HeadingOne>Official Policy URLs</HeadingOne>
            <Paragraph>
                <Bold>Privacy Policy:&nbsp;</Bold>
                <Link href='https://www.maneaccount.com/privacy'>https://www.maneaccount.com/privacy</Link>
            </Paragraph>
            <Paragraph>
                <Bold>Terms of Service:&nbsp;</Bold>
                <Link href='https://www.maneaccount.com/terms'>https://www.maneaccount.com/terms</Link>
            </Paragraph>
        </LegalPageLayout>
    );
};

export default PrivacyPage;
