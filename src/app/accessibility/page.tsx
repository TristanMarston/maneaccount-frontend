import Link from 'next/link';
import { LegalPageLayout, Title, HeadingOne, HeadingTwo, Bold, BulletList, BulletItem, Paragraph } from '../_components/LegalHelper';

const AccessibilityPage = () => {
    return (
        <LegalPageLayout>
            <Title>Accessibility Statement</Title>
            <Paragraph>
                <Bold>Mane Account Website Application</Bold>
            </Paragraph>
            <Paragraph>
                <Bold>Last Updated:</Bold> January 1st, 2026
            </Paragraph>
            <Paragraph>
                Counter Canter Collective LLC, doing business as <Bold>Mane Account</Bold> (&quot;<Bold>Company</Bold>&quot;, &quot;<Bold>we</Bold>&quot;, &quot;<Bold>us</Bold>&quot;,
                or &quot;<Bold>our</Bold>&quot;), is committed to making the Mane Account website application, website, and related services (collectively, the &quot;
                <Bold>Services</Bold>&quot;) accessible and usable for as many people as reasonably possible, including individuals with disabilities.
            </Paragraph>

            <HeadingOne>Our Commitment to Accessibility</HeadingOne>
            <Paragraph>
                We believe accessibility is an ongoing effort and an important part of providing an inclusive digital experience. We strive to design and maintain our Services in a way
                that supports usability, clarity, and accessibility for all users.
            </Paragraph>
            <Paragraph>
                Where feasible, we aim to follow generally recognized accessibility standards, including the <Bold>Web Content Accessibility Guidelines (WCAG)</Bold> published by the
                World Wide Web Consortium (W3C), and to continuously improve accessibility over time.
            </Paragraph>

            <HeadingOne>Accessibility Features & Practices</HeadingOne>
            <Paragraph>Our efforts may include, but are not limited to:</Paragraph>
            <BulletList>
                <BulletItem>Using clear, legible text and consistent layouts</BulletItem>
                <BulletItem>Providing logical navigation and predictable interactions</BulletItem>
                <BulletItem>Designing interfaces that can be used with standard accessibility tools and device settings</BulletItem>
            </BulletList>
            <Paragraph>Because technology and user needs evolve, accessibility improvements are ongoing.</Paragraph>

            <HeadingOne>Limits & Ongoing Improvements</HeadingOne>
            <Paragraph>
                While we strive to make our Services accessible, some content, features, or third-party integrations may not yet fully meet all accessibility standards. We continue to
                evaluate and improve accessibility as part of our development process.
            </Paragraph>
            <Paragraph>Third-party platforms and external services integrated into the App are governed by their own accessibility practices and policies.</Paragraph>

            <HeadingOne>Need Assistance or Want to Report An Issue?</HeadingOne>
            <Paragraph>
                If you experience difficulty accessing any part of the Services, require assistance, or would like to report an accessibility concern, please contact us:
            </Paragraph>
            <Paragraph>
                <Bold>Email:&nbsp;</Bold>
                <Link href='mailto:connect.mane.team@gmail.com'>connect.mane.team@gmail.com</Link>
            </Paragraph>
            <Paragraph>When contacting us, please include:</Paragraph>
            <BulletList>
                <BulletItem>A description of the issue</BulletItem>
                <BulletItem>The device and operating system you are using</BulletItem>
                <BulletItem>The specific page or feature involved (if applicable)</BulletItem>
            </BulletList>
            <Paragraph>We will make reasonable efforts to review and address accessibility concerns in a timely manner.</Paragraph>

            <HeadingOne>Continuous Improvement</HeadingOne>
            <Paragraph>Accessibility is an ongoing commitment. We welcome feedback and use it to help guide future improvements to our Services.</Paragraph>

            <HeadingOne>Related Policies</HeadingOne>
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

export default AccessibilityPage;
